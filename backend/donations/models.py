from django.db import models
from django.conf import settings
from events.models import Event

class DonationCampaign(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="donation_campaigns")
    organization = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="donation_campaigns")
    title = models.CharField(max_length=200)
    goal_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Donation(models.Model):
    campaign = models.ForeignKey(DonationCampaign, on_delete=models.CASCADE, related_name="donations")
    donor_name = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    # בהמשך אפשר להוסיף status + transaction_id אם מחברים סליקה
