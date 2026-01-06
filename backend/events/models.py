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


class EventSignup(models.Model):
    # מי נרשם לאיזה אירוע (רק מתנדבים)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="signups",  # event.signups.all()
    )
    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_signups",
        limit_choices_to={"role": "VOLUNTEER"},
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "volunteer"],
                name="unique_volunteer_per_event",
            )
        ]

    def __str__(self):
        return f"{self.volunteer_id} -> {self.event_id}"
