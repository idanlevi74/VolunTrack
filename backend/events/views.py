from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg

from accounts.permissions import IsOrganization, IsVolunteer
from .models import Event, EventSignup
from . import serializers as s


from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Avg

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsOrganization, IsVolunteer
from .models import Event, EventSignup
from . import serializers as s

def user_has_role(user, role_name: str) -> bool:
    """
    עובד גם אם role נשמר כמחרוזת ("ORG"/"VOLUNTEER")
    וגם אם יש Enum פנימי user.Role.ORG
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False

    user_role = getattr(user, "role", None)

    # מקרה 1: role נשמר כמחרוזת
    if isinstance(user_role, str):
        return user_role.upper() == role_name.upper()

    # מקרה 2: role הוא Enum/Choice (משווים לערך/שם)
    try:
        enum = getattr(user, "Role", None)
        if enum and hasattr(enum, role_name):
            return user_role == getattr(enum, role_name)
    except Exception:
        pass

    # fallback: השוואה ל-string של האובייקט
    return str(user_role).upper() == role_name.upper()
class EventViewSet(viewsets.ModelViewSet):
    serializer_class = s.EventSerializer

    # ======================
    # מי רואה איזה אירועים (+ status filter לדשבורד)
    # ======================
    def get_queryset(self):
        user = self.request.user
        qs = Event.objects.all()

        if not user or not user.is_authenticated:
            return qs

        status_param = self.request.query_params.get("status")
        today = timezone.localdate()

        # 🏢 עמותה
        if user_has_role(user, "ORG"):
            org_qs = qs.filter(organization=user)

            if status_param == "upcoming":
                return org_qs.filter(date__gte=today).order_by("date")

            if status_param == "history":
                return org_qs.filter(date__lt=today).order_by("-date")

            return org_qs

        # 🙋 מתנדב
        if status_param in ("upcoming", "history"):
            my_event_ids = EventSignup.objects.filter(volunteer=user).values_list("event_id", flat=True)
            my_events = qs.filter(id__in=my_event_ids).distinct()

            if status_param == "upcoming":
                return my_events.filter(date__gte=today).order_by("date")

            return my_events.filter(date__lt=today).order_by("-date")

        return qs

    # ======================
    # הרשאות לפי פעולה
    # ======================
    def get_permissions(self):
        # 👀 צפייה ציבורית
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]

        # 🏢 ניהול אירועים — רק עמותה מחוברת
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOrganization()]

        # 🙋 הרשמה/ביטול — רק מתנדב מחובר
        if self.action in ["signup", "cancel"]:
            return [permissions.IsAuthenticated(), IsVolunteer()]

        # 🏢 צפייה בנרשמים — רק עמותה מחוברת
        if self.action in ["signups"]:
            return [permissions.IsAuthenticated(), IsOrganization()]

        # 🏢 דירוג מתנדב — רק עמותה מחוברת
        if self.action in ["rate"]:
            return [permissions.IsAuthenticated(), IsOrganization()]

        # ברירת מחדל (בטיחות)
        return [permissions.IsAuthenticated()]

    # ======================
    # יצירת אירוע: organization נקבע מה-user
    # ======================
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user)

    # ======================
    # הרשמה לאירוע (מתנדב)
    # POST /api/events/{id}/signup/
    # ======================
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, IsVolunteer],
    )
    def signup(self, request, pk=None):
        event = self.get_object()

        signup, created = EventSignup.objects.get_or_create(
            event=event,
            volunteer=request.user,
        )

        if not created:
            return Response(
                {"detail": "Already signed up"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Signed up successfully"},
            status=status.HTTP_201_CREATED,
        )

    # ======================
    # ביטול הרשמה
    # POST /api/events/{id}/cancel/
    # ======================
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, IsVolunteer],
    )
    def cancel(self, request, pk=None):
        event = self.get_object()

        deleted, _ = EventSignup.objects.filter(
            event=event,
            volunteer=request.user,
        ).delete()

        if deleted == 0:
            return Response(
                {"detail": "Not signed up"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Signup canceled"},
            status=status.HTTP_200_OK,
        )

    # ======================
    # מי רשום לאירוע (רק העמותה שיצרה)
    # GET /api/events/{id}/signups/
    # ======================
    @action(
        detail=True,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated, IsOrganization],
    )
    def signups(self, request, pk=None):
        event = self.get_object()

        if event.organization != request.user:
            return Response(
                {"detail": "Not allowed"},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = event.signups.select_related("volunteer").order_by("created_at")
        serializer = s.EventSignupSerializer(qs, many=True)
        return Response(serializer.data)

    # ======================
    # דירוג מתנדב באירוע (רק העמותה שיצרה, ורק אחרי שהאירוע עבר)
    # POST /api/events/{id}/rate/
    # body:
    # {
    #   "signup_id": 123,
    #   "rating_reliability": 5,
    #   "rating_execution": 4,
    #   "rating_teamwork": 5,
    #   "notes": "...", "role": "...", "hours": "...", "task_desc": "..."
    # }
    # ======================
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, IsOrganization],
        url_path="rate",
    )
    def rate(self, request, pk=None):
        event = self.get_object()

        # רק העמותה שיצרה את האירוע יכולה לדרג
        if event.organization != request.user:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        # רק אחרי שהאירוע עבר (לפי תאריך)
        today = timezone.localdate()
        if event.date >= today:
            return Response(
                {"detail": "You can rate only after the event ends"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = s.RateSignupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        signup = get_object_or_404(EventSignup, id=data["signup_id"], event=event)

        # ✅ עריכה מותרת: פשוט מעדכנים מחדש
        signup.rating_reliability = data["rating_reliability"]
        signup.rating_execution = data["rating_execution"]
        signup.rating_teamwork = data["rating_teamwork"]

        # חישוב ציון כללי
        signup.rating = round(
            (signup.rating_reliability + signup.rating_execution + signup.rating_teamwork) / 3,
            2
        )

        # מטא דירוג: "עודכן לאחרונה"
        signup.rated_at = timezone.now()
        signup.rated_by = request.user

        # שדות אופציונליים אם נשלחו
        for f in ["notes", "role", "hours", "task_desc"]:
            if f in data:
                setattr(signup, f, data[f])

        signup.save()

        return Response(
            {
                "detail": "Rated successfully",
                "signup_id": signup.id,
                "volunteer_id": signup.volunteer_id,
                "rating_reliability": signup.rating_reliability,
                "rating_execution": signup.rating_execution,
                "rating_teamwork": signup.rating_teamwork,
                "rating": signup.rating,
                "rated_at": signup.rated_at,
                "rated_by": getattr(request.user, "id", None),
            },
            status=status.HTTP_200_OK,
        )


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVolunteer]

    def get(self, request):
        today = timezone.localdate()

        activities_count = EventSignup.objects.filter(
            volunteer=request.user,
            event__date__lt=today
        ).count()

        rated_qs = EventSignup.objects.filter(
            volunteer=request.user,
            rating__isnull=False      # ✅ שדה נכון
        )

        avg_rating = rated_qs.aggregate(avg=Avg("rating"))["avg"]   # ✅ שדה נכון
        ratings_count = rated_qs.count()

        reliability = round(float(avg_rating), 2) if avg_rating is not None else 0

        profile = getattr(request.user, "vol_profile", None)
        if profile:
            profile.reliability_score = reliability
            profile.save(update_fields=["reliability_score"])

        return Response({
            "reliability_score": reliability,
            "ratings_count": ratings_count,
            "activities_count": activities_count,
            "hours_total": 0,
        })


class OrgAdminView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = str(getattr(request.user, "role", "")).upper()
        return Response({"can_manage": role in ("ORG", "ADMIN")})
