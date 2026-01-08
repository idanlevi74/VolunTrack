from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsOrganization, IsVolunteer
from .models import Event, EventSignup
from .serializers import EventSerializer, EventSignupSerializer


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer

    # ======================
    # מי רואה איזה אירועים
    # ======================
    def get_queryset(self):
        user = self.request.user

        # 👀 לא מחובר (אדם חיצוני) — רואה את כל האירועים (ציבורי)
        if not user or not user.is_authenticated:
            return Event.objects.all()

        # 🏢 עמותה — רואה רק את האירועים שלה
        if user.role == user.Role.ORG:
            return Event.objects.filter(organization=user)

        # 🙋 מתנדב — רואה את כל האירועים
        return Event.objects.all()

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
        serializer = EventSignupSerializer(qs, many=True)
        return Response(serializer.data)
