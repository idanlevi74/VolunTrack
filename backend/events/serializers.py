from rest_framework import serializers
from .models import Event, EventSignup


class EventSerializer(serializers.ModelSerializer):
    signups_count = serializers.IntegerField(source="signups.count", read_only=True)

    org_name = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "category",
            "location",
            "date",
            "time",
            "needed_volunteers",
            "organization",
            "org_name",          # 👈 חדש
            "created_at",
            "signups_count",
        ]
        read_only_fields = ["organization", "created_at"]

    def get_org_name(self, obj):
        org = obj.organization
        prof = getattr(org, "org_profile", None)
        return (getattr(prof, "org_name", "") or org.email) if org else ""


class EventSignupRatingSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.CharField(source="volunteer.vol_profile.full_name", read_only=True)

    class Meta:
        model = EventSignup
        fields = [
            "id",
            "volunteer_name",
            "role",
            "hours",
            "task_desc",
            "notes",
            "rating_reliability",
            "rating_execution",
            "rating_teamwork",
            "rating",
            "rated_at",
        ]
        read_only_fields = ["id", "volunteer_name", "rating", "rated_at"]

    def validate(self, attrs):
        # בדיקה 1–5 אם נשלח
        for f in ("rating_reliability", "rating_execution", "rating_teamwork"):
            if f in attrs and attrs[f] is not None:
                if not (1 <= attrs[f] <= 5):
                    raise serializers.ValidationError({f: "Rating must be between 1 and 5"})
        return attrs
