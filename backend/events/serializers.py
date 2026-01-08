from rest_framework import serializers
from .models import Event, EventSignup


class EventSerializer(serializers.ModelSerializer):
    signups_count = serializers.IntegerField(source="signups.count", read_only=True)

    # 👇 זה מה שהדשבורד צריך
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
        if not org:
            return ""
        # אם בעתיד יהיה OrganizationProfile עם שם – כאן משנים
        return getattr(org, "email", "")
