from rest_framework import serializers
from .models import Event, EventSignup


class EventSerializer(serializers.ModelSerializer):
    # ✅ כדי שהפרונט יוכל להציג "נרשמו / נשארו"
    signups_count = serializers.IntegerField(source="signups.count", read_only=True)

    # אם אצלך זה קיים (כמו שכתבת קודם)
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

    def get_org_name(self, obj):
        org = getattr(obj, "organization", None)
        return getattr(org, "email", "") if org else ""


class EventSignupSerializer(serializers.ModelSerializer):
    # ✅ לא נופל אם אין vol_profile / full_name
    volunteer_name = serializers.SerializerMethodField()

    class Meta:
        model = EventSignup
        fields = ["id", "volunteer_name", "created_at"]

    def get_volunteer_name(self, obj):
        v = getattr(obj, "volunteer", None)
        if not v:
            return ""

        # ננסה לקחת full_name מהפרופיל אם קיים
        profile = getattr(v, "vol_profile", None)
        full_name = getattr(profile, "full_name", None) if profile else None
        if full_name:
            return full_name

        # fallback
        return getattr(v, "email", "") or str(v)
