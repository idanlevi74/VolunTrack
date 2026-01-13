from django.conf import settings
from django.db import models


class Event(models.Model):
    # רק עמותה יוצרת אירוע
    organization = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events_created",
        limit_choices_to={"role": "ORG"},
    )

    title = models.CharField(max_length=200)
    description = models.TextField()

    category = models.CharField(max_length=100)
    location = models.CharField(max_length=120)

    # תואם JSX (date + time)
    date = models.DateField()
    time = models.TimeField()

    needed_volunteers = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


from django.db import models
from django.conf import settings

class EventSignup(models.Model):
    event = models.ForeignKey("Event", related_name="signups", on_delete=models.CASCADE)
    volunteer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    created_at = models.DateTimeField(auto_now_add=True)

    # --- דירוגים (1–5) ---
    rating_reliability = models.PositiveSmallIntegerField(null=True, blank=True)
    rating_execution = models.PositiveSmallIntegerField(null=True, blank=True)
    rating_teamwork = models.PositiveSmallIntegerField(null=True, blank=True)

    # ציון כללי ממוצע (לנוחות) – אופציונלי
    rating = models.FloatField(null=True, blank=True)

    # מטא
    role = models.CharField(max_length=64, blank=True, default="")
    hours = models.CharField(max_length=64, blank=True, default="")
    task_desc = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    rated_at = models.DateTimeField(null=True, blank=True)
    rated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="ratings_given"
    )

    class Meta:
        unique_together = ("event", "volunteer")

