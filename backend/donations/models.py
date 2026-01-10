from django.db import models
from django.conf import settings


class DonationCampaign(models.Model):
    """
    קמפיין תרומה של עמותה (אופציונלי להשתמש בו בדף תרומה).
    """
    organization = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="donation_campaigns",  # ✅ ייחודי
        limit_choices_to={"role": "ORG"},
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    goal_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.organization_id})"


class Donation(models.Model):
    """
    תרומה:
    - כל אחד יכול לתרום (גם ללא התחברות)
    - אם התורם מחובר: donor_user נשמר
    - אם לא מחובר: donor_name נשמר כ"אנונימי" (או השם שנשלח)
    """
    organization = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="donations_received",  # ✅ ייחודי ושונה מהקמפיינים
        limit_choices_to={"role": "ORG"},
        null=True,
        blank=True,
    )

    # אופציונלי: לחבר לקמפיין (אם תרצי)
    campaign = models.ForeignKey(
        DonationCampaign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="donations",
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # ✅ תורם מחובר (אם יש)
    donor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="donations_made",
    )

    # ✅ תורם לא מחובר (או גם מחובר אם רוצים לשמור שם/מייל לקבלה)
    donor_name = models.CharField(max_length=200, blank=True, default="אנונימי")
    donor_email = models.EmailField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        who = self.donor_name or "אנונימי"
        return f"Donation ₪{self.amount} to org#{self.organization_id} by {who}"
