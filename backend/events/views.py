from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsOrganization, IsVolunteer
from .models import Event, EventSignup
from .serializers import EventSerializer

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by("-created_at")
    serializer_class = EventSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOrganization()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsVolunteer])
    def signup(self, request, pk=None):
        event = self.get_object()
        signup, created = EventSignup.objects.get_or_create(event=event, volunteer=request.user)
        if not created:
            return Response({"detail": "Already signed up"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Signed up"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsVolunteer])
    def cancel(self, request, pk=None):
        event = self.get_object()
        deleted, _ = EventSignup.objects.filter(event=event, volunteer=request.user).delete()
        if deleted == 0:
            return Response({"detail": "Not signed up"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Canceled"}, status=status.HTTP_200_OK)
