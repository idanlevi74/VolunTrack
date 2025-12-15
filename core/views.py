from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import Organization, Event, Registration
from .serializers import (
    OrganizationSerializer,
    EventSerializer,
    RegistrationSerializer
)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    רק הבעלים של האובייקט יכול לערוך; אחרים יכולים רק לקרוא.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # Organization
        if hasattr(obj, 'owner'):
            return obj.owner == request.user

        # Event – הבעלים הוא בעל הארגון
        if hasattr(obj, 'organization'):
            return obj.organization.owner == request.user

        return False


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related('organization').all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]


class RegistrationViewSet(viewsets.ModelViewSet):
    queryset = Registration.objects.select_related('volunteer', 'event').all()
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # מתנדב יראה ברירת מחדל רק את ההרשמות של עצמו
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(volunteer=user)

    def perform_create(self, serializer):
        serializer.save(volunteer=self.request.user)

    @action(detail=False, methods=['post'], url_path='cancel')
    def cancel_registration(self, request):
        """
        ביטול הרשמה לאירוע (ע"י המתנדב).
        מצפה ל: { "registration_id": X }
        """
        reg_id = request.data.get('registration_id')
        try:
            reg = Registration.objects.get(id=reg_id, volunteer=request.user)
        except Registration.DoesNotExist:
            return Response({"detail": "Registration not found"}, status=404)

        reg.status = 'CANCELLED'
        reg.save()
        return Response(RegistrationSerializer(reg).data)

