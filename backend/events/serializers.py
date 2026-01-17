from rest_framework import serializers
from .models import Event, EventSignup


class EventSerializer(serializers.ModelSerializer):
    city = serializers.SerializerMethodField()

    # ✅ ספירה "רכה" אבל עם fallback מהיר אם זה הגיע מהשרת כאנוטציה
    signups_count = serializers.SerializerMethodField()

    org_name = serializers.SerializerMethodField()

    # ✅ דירוג של המתנדב לאירוע הזה (אם הוא רשום)
    my_rating = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "volunteer_name",
            "volunteer_email",
            "created_at",

            # ✅ מטא
            "role",
            "hours",
            "task_desc",
            "notes",

            # ✅ דירוגים
            "rating_reliability",
            "rating_execution",
            "rating_teamwork",
            "rating",

            # ✅ מי ומתי דירג
            "rated_at",
            "rated_by",
        ]
        read_only_fields = ["organization", "created_at", "signups_count", "my_rating"]

    def get_city(self, obj):
        return getattr(obj, "city", "") or ""

    def get_signups_count(self, obj):
        # אם בעתיד תעשי annotate(signups_count=Count("signups"))
        annotated = getattr(obj, "signups_count", None)
        if annotated is not None:
            return annotated
        return EventSignup.objects.filter(event=obj).count()

    def get_org_name(self, obj):
        org = getattr(obj, "organization", None)
        return getattr(org, "email", "") if org else ""

    def get_my_rating(self, obj):
        req = self.context.get("request")
        user = getattr(req, "user", None)

        if not user or not user.is_authenticated:
            return None

        # אם יש אצלך Roles אחרים, זה עדיין בטוח (רק מתנדב צריך לראות my_rating)
        if getattr(user, "role", None) != user.Role.VOLUNTEER:
            return None

        signup = (
            EventSignup.objects
            .filter(event=obj, volunteer=user)
            .only("rating")
            .first()
        )
        return getattr(signup, "rating", None) if signup else None


class EventSignupSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.SerializerMethodField()
    volunteer_email = serializers.SerializerMethodField()

    class Meta:
        model = EventSignup
        fields = [
            "id",
            "volunteer_name",
            "volunteer_email",
            "created_at",

            # 🧩 שדות תפעוליים
            "role",
            "hours",
            "task_desc",
            "notes",

            # ⭐ דירוגים
            "rating_reliability",
            "rating_execution",
            "rating_teamwork",
            "rating",        # ממוצע כללי

            # 🕒 מטא דירוג
            "rated_at",
        ]

    def get_volunteer_name(self, obj):
        v = getattr(obj, "volunteer", None)
        if not v:
            return ""

        profile = getattr(v, "vol_profile", None)
        full_name = getattr(profile, "full_name", None) if profile else None
        if full_name:
            return full_name

        return getattr(v, "email", "") or str(v)

    def get_volunteer_email(self, obj):
        v = getattr(obj, "volunteer", None)
        return getattr(v, "email", "") if v else ""

class RateSignupSerializer(serializers.Serializer):
    signup_id = serializers.IntegerField()
    rating_reliability = serializers.IntegerField(min_value=1, max_value=5)
    rating_execution = serializers.IntegerField(min_value=1, max_value=5)
    rating_teamwork = serializers.IntegerField(min_value=1, max_value=5)
    notes = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True)
    hours = serializers.CharField(required=False, allow_blank=True)
    task_desc = serializers.CharField(required=False, allow_blank=True)

