from rest_framework import viewsets, permissions
from .models import OrganizationProfile
from .serializers import OrganizationProfileSerializer


class OrganizationProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/organizations/  -> כל העמותות
    GET /api/organizations/{id}/ -> עמותה ספציפית
    """
    queryset = OrganizationProfile.objects.all().order_by("org_name")
    serializer_class = OrganizationProfileSerializer
    permission_classes = [permissions.AllowAny]  # שכולם יוכלו לראות עמותות
