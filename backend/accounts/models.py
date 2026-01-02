from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    # מבטלים username כדי שהזדהות תהיה על email
    username = None
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Role(models.TextChoices):
        VOLUNTEER = "VOLUNTEER", "Volunteer"
        ORG = "ORG", "Organization"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VOLUNTEER,
    )

    def save(self, *args, **kwargs):
        # אם זה סופר-יוזר, נכריח role=ADMIN
        if self.is_superuser and self.role != self.Role.ADMIN:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)


class VolunteerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vol_profile"
    )
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True)
    city = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.full_name
