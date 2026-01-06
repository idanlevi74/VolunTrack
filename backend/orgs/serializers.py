from rest_framework import serializers
from .models import OrganizationProfile


class OrganizationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationProfile
        fields = ["id", "org_name", "description", "phone", "website"]
