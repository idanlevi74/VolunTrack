from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg
from accounts.permissions import IsOrganization, IsVolunteer
from .models import Event, EventSignup
from . import serializers as s


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = s.EventSerializer

    # ======================
    # מי רואה איזה אירועים (+ status filter לדשבורד)
    # ======================
    def get_queryset(self):
        user = self.request.user
        qs = Event.objects.all()

        # 👀 לא מחובר (אדם חיצוני) — רואה את כל האירועים (ציבורי)
        if not user or not user.is_authenticated:
            return qs

        # 🏢 עמותה — רואה רק את האירועים שלה
        if user.role == user.Role.ORG:
            return qs.filter(organization=user)

        # 🙋 מתנדב — ברירת מחדל: כל האירועים
        # אבל: לדשבורד אנחנו רוצים "שלי" לפי status=upcoming/history
        status_param = self.request.query_params.get("status")
        if status_param in ("upcoming", "history"):
            today = timezone.localdate()

            # רק אירועים שהמתנדב נרשם אליהם
            my_events = qs.filter(signups__volunteer=user).distinct()

            if status_param == "upcoming":
                # פעילויות קרובות
                return my_events.filter(date__gte=today).order_by("date")

            # history
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

        qs = event.signups.select_related("volunteer", "volunteer__vol_profile")
        serializer = s.EventSignupSerializer(qs, many=True)
        return Response(serializer.data)

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVolunteer]

    def get(self, request):
        today = timezone.localdate()

        activities_count = EventSignup.objects.filter(
            volunteer=request.user,
            event__date__lt=today
        ).count()

        avg_rating = EventSignup.objects.filter(
            volunteer=request.user,
            rating__isnull=False
        ).aggregate(avg=Avg("rating"))["avg"]

        reliability = round(avg_rating, 2) if avg_rating else 0

        profile = request.user.vol_profile
        profile.reliability_score = reliability
        profile.save(update_fields=["reliability_score"])

        return Response({
            "reliability_score": reliability,  # ⭐ 1–5
            "activities_count": activities_count,
            "hours_total": 0,
        })
class OrgAdminView(APIView):
    permission_classes = [permissions.IsAuthenticated]
def get(self, request):
    u = request.user
    return Response({ "can_manage": u.role in (u.Role.ORG, u.Role.ADMIN), })