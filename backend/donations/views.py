# donations/views.py
from rest_framework import viewsets, permissions
from accounts.permissions import IsOrganization
from .models import DonationCampaign, Donation
from .serializers import DonationCampaignSerializer, DonationSerializer


class DonationCampaignViewSet(viewsets.ModelViewSet):
    queryset = DonationCampaign.objects.all().order_by("-created_at")
    serializer_class = DonationCampaignSerializer

    def get_permissions(self):
        # ✅ יצירה/עריכה/מחיקה רק לעמותה מחוברת
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOrganization()]
        # ✅ צפייה בקמפיינים (רשימה/פרטים) — ציבורי
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = DonationCampaign.objects.all().order_by("-created_at")
        user = getattr(self.request, "user", None)

        # ציבורי: מציגים רק פעילים
        if not user or not user.is_authenticated:
            return qs.filter(is_active=True)

        # עמותה: רואה רק את שלה (כולל לא פעילים)
        if user.role == user.Role.ORG:
            return qs.filter(organization=user)

        # אדמין: רואה הכל
        if user.role == user.Role.ADMIN:
            return qs

        # מתנדב: רואה רק פעילים
        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user)


class DonationViewSet(viewsets.ModelViewSet):
    serializer_class = DonationSerializer

    def get_permissions(self):
        # ✅ כל אחד יכול ליצור תרומה (גם בלי התחברות)
        if self.action == "create":
            return [permissions.AllowAny()]

        # ✅ צפייה/ניהול תרומות — רק עמותה/אדמין
        if self.action in ["list", "retrieve", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOrganization()]

        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Donation.objects.select_related("organization", "campaign", "donor_user").order_by("-created_at")
        user = getattr(self.request, "user", None)

        if not user or not user.is_authenticated:
            return Donation.objects.none()

        # עמותה רואה רק תרומות אליה
        if user.role == user.Role.ORG:
            return qs.filter(organization=user)

        # אדמין רואה הכל
        if user.role == user.Role.ADMIN:
            return qs

        # מתנדב/אחרים לא רואים (כדי לא לחשוף תרומות)
        return Donation.objects.none()

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)

        # אם תורם מחובר — נשמור donor_user
        if user and user.is_authenticated:
            # אם לא נשלח donor_name, אפשר לנסות להביא מהפרופיל (מתנדב)
            default_name = ""
            vol = getattr(user, "vol_profile", None)
            if vol:
                default_name = vol.full_name

            serializer.save(
                donor_user=user,
                donor_name=serializer.validated_data.get("donor_name") or default_name or "אנונימי",
            )
        else:
            # לא מחובר — אנונימי אם לא שלח שם
            serializer.save(
                donor_name=serializer.validated_data.get("donor_name") or "אנונימי",
            )
