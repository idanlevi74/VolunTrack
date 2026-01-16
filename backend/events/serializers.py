from rest_framework import serializers
from django.db.models import Count
from .models import Event, EventSignup


class EventSerializer(serializers.ModelSerializer):
    # ✅ ספירה בטוחה של נרשמים – לא תלוי ב-related_name
    signups_count = serializers.SerializerMethodField()

    org_name = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "category",
            "location",
            "city",
            "date",
            "time",
            "needed_volunteers",
            "organization",
            "org_name",
            "created_at",
            "signups_count",
        ]
        read_only_fields = ["organization", "created_at", "signups_count"]

    def get_signups_count(self, obj):
        # ✅ עובד תמיד, גם אם אין related_name
        return EventSignup.objects.filter(event=obj).count()

    def get_org_name(self, obj):
        org = getattr(obj, "organization", None)
        return getattr(org, "email", "") if org else ""


class EventSignupSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.SerializerMethodField()

    class Meta:
        model = EventSignup
        fields = ["id", "volunteer_name", "created_at"]

    def get_volunteer_name(self, obj):
        v = getattr(obj, "volunteer", None)
        if not v:
            return ""

        # ננסה full_name מהפרופיל אם קיים
        profile = getattr(v, "vol_profile", None)
        full_name = getattr(profile, "full_name", None) if profile else None
        if full_name:
            return full_name

        # fallback בטוח
        return getattr(v, "email", "") or str(v)
