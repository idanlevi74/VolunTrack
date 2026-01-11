from rest_framework import serializers
from .models import OrganizationProfile

class OrganizationProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)

    class Meta:
        model = OrganizationProfile
        fields = [
            "id",          # id של הפרופיל
            "user_id",     # ✅ זה מה שצריך לתרומה
            "org_name",
            "description",
            "phone",
            "website",
            "email",
            "role",
        ]
