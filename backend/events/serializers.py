from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from accounts.models import VolunteerProfile
from orgs.models import OrganizationProfile

User = get_user_model()


# =========================
# Register Volunteer
# =========================
class RegisterVolunteerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    city = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "full_name", "phone", "city"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email already exists")
        return email

    @transaction.atomic
    def create(self, validated_data):
        full_name = validated_data.pop("full_name")
        phone = validated_data.pop("phone", "")
        city = validated_data.pop("city", "")
        password = validated_data.pop("password")

        user = User(
            email=validated_data["email"],
            role=User.Role.VOLUNTEER,
        )
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
        return {
            "id": instance.id,
            "email": instance.email,
            "role": instance.role,
            "full_name": instance.vol_profile.full_name,
        }


# =========================
# Register Organization
# =========================
class RegisterOrgSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(write_only=True)
    description = serializers.CharField(required=False, allow_blank=True, write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    website = serializers.URLField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ["email", "password", "org_name", "description", "phone", "website"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email already exists")
        return email

    @transaction.atomic
    def create(self, validated_data):
        org_name = validated_data.pop("org_name")
        description = validated_data.pop("description", "")
        phone = validated_data.pop("phone", "")
        website = validated_data.pop("website", "")
        password = validated_data.pop("password")

        user = User(
            email=validated_data["email"],
            role=User.Role.ORG,
        )
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
        return {
            "id": instance.id,
            "email": instance.email,
            "role": instance.role,
            "org_name": instance.org_profile.org_name,
        }
