from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import OrganizationProfile
from .serializers import OrganizationProfileSerializer

class OrganizationProfileViewSet(viewsets.ModelViewSet):
    """
    GET  /api/organizations/           -> כל העמותות (פומבי)
    GET  /api/organizations/{id}/      -> עמותה ספציפית (פומבי)
    GET  /api/organizations/me/        -> פרטי העמותה המחוברת
    PATCH /api/organizations/me/       -> עדכון פרטי עמותה
    """

    queryset = OrganizationProfile.objects.all().order_by("org_name")
    serializer_class = OrganizationProfileSerializer

    def get_permissions(self):
        # צפייה פומבית
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]

        # כל השאר – רק מחוברים
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        user = request.user

        # רק ORG / ADMIN
        if getattr(user, "role", None) not in ("ORG", "ADMIN"):
            return Response(
                {"detail": "Only organization users can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # אם אין פרופיל – ניצור אוטומטית (חשוב!)
        profile, _ = OrganizationProfile.objects.get_or_create(
            user=user,
            defaults={
                "org_name": user.email.split("@")[0],
                "description": "",
                "phone": "",
                "website": "",
            },
        )

        if request.method == "GET":
            return Response(self.get_serializer(profile).data)

        # PATCH
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)