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
        # ✅ לא מבקשים username מהלקוח - אנחנו נגזור אותו מה-email
        fields = ["email", "password", "full_name", "phone", "city"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email already exists")
        return email

    def create(self, validated_data):
        full_name = validated_data.pop("full_name")
        phone = validated_data.pop("phone", "")
        city = validated_data.pop("city", "")

        password = validated_data.pop("password")
        email = validated_data.get("email")  # כבר עבר validate ונרמל ל-lower

        # ✅ אם username חובה במודל: נשמור username=email
        user = User(**validated_data, username=email, role="VOLUNTEER")
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
            "username": instance.username,  # יהיה שווה לאימייל
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
        # ✅ לא מבקשים username מהלקוח - אנחנו נגזור אותו מה-email
        fields = ["email", "password", "org_name", "description", "phone", "website"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email already exists")
        return email

    def create(self, validated_data):
        org_name = validated_data.pop("org_name")
        description = validated_data.pop("description", "")
        phone = validated_data.pop("phone", "")
        website = validated_data.pop("website", "")

        password = validated_data.pop("password")
        email = validated_data.get("email")  # כבר עבר validate ונרמל ל-lower

        user = User(**validated_data, username=email, role="ORG")
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
            "username": instance.username,  # יהיה שווה לאימייל
            "email": instance.email,
            "role": instance.role,
        }
