from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import VolunteerProfile
from orgs.models import OrganizationProfile  # ודאי שזה הנתיב הנכון אצלך

User = get_user_model()


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
        # email כבר נורמל ב-validate_email
        email = validated_data.get("email")

        # ✅ חשוב: אין username במודל שלך, אז לא שולחים username בכלל
        user = User(**validated_data, role=User.Role.VOLUNTEER)
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
        # החזרה נקייה לפרונט
        return {
            "id": instance.id,
            "email": instance.email,
            "role": instance.role,
            "full_name": getattr(getattr(instance, "vol_profile", None), "full_name", ""),
        }


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
        email = validated_data.get("email")

        # ✅ חשוב: אין username במודל שלך
        user = User(**validated_data, role=User.Role.ORG)
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
        # החזרה נקייה לפרונט
        org_profile = getattr(instance, "org_profile", None) or getattr(instance, "orgprofile", None)
        # (תלוי איך קראת ל-related_name במודל OrganizationProfile)
        return {
            "id": instance.id,
            "email": instance.email,
            "role": instance.role,
            "org_name": getattr(org_profile, "org_name", ""),
        }
class VolunteerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VolunteerProfile
        fields = ["full_name", "phone", "city", "points", "reliability_score"]
        read_only_fields = ["points", "reliability_score"]