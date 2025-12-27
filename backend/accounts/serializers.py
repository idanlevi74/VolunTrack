from rest_framework import serializers
from django.contrib.auth import get_user_model
from orgs.models import OrganizationProfile
from .models import VolunteerProfile

User = get_user_model()

class RegisterVolunteerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    city = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "full_name", "phone", "city"]
        extra_kwargs = {
            "password": {"write_only": True}
        }

    def create(self, validated_data):
        full_name = validated_data.pop("full_name")
        phone = validated_data.pop("phone", "")
        city = validated_data.pop("city", "")

        password = validated_data.pop("password")
        user = User(**validated_data, role="VOLUNTEER")
        user.set_password(password)
        user.save()

        VolunteerProfile.objects.create(
            user=user,
            full_name=full_name,
            phone=phone,
            city=city,
        )

        return user

    def to_representation(self, instance):
        # תגובה נקייה ל־React
        return {
            "id": instance.id,
            "username": instance.username,
            "email": instance.email,
            "role": instance.role,
        }

class RegisterOrgSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(write_only=True)
    description = serializers.CharField(required=False, allow_blank=True, write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    website = serializers.URLField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "org_name", "description", "phone", "website"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        org_name = validated_data.pop("org_name")
        description = validated_data.pop("description", "")
        phone = validated_data.pop("phone", "")
        website = validated_data.pop("website", "")

        password = validated_data.pop("password")
        user = User(**validated_data, role="ORG")
        user.set_password(password)
        user.save()

        OrganizationProfile.objects.create(
            user=user,
            org_name=org_name,
            description=description,
            phone=phone,
            website=website,
        )
        return user

    def to_representation(self, instance):
        # מחזירים תגובה נקייה בלי שדות שלא קיימים ב-User
        return {
            "id": instance.id,
            "username": instance.username,
            "email": instance.email,
            "role": instance.role,
        }
