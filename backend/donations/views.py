from rest_framework import viewsets, permissions
from accounts.permissions import IsOrganization
from .models import DonationCampaign, Donation
from .serializers import DonationCampaignSerializer, DonationSerializer

class DonationCampaignViewSet(viewsets.ModelViewSet):
    queryset = DonationCampaign.objects.all().order_by("-created_at")
    serializer_class = DonationCampaignSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOrganization()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user)

class DonationViewSet(viewsets.ModelViewSet):
    queryset = Donation.objects.all().order_by("-created_at")
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticated]
