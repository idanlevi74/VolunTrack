# donations/views.py
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

import stripe
from stripe.error import StripeError  # ✅ חדש

from rest_framework import viewsets, permissions, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import IsOrganization
from .models import DonationCampaign, Donation
from .serializers import DonationCampaignSerializer, DonationSerializer


# ======================
# Stripe config
# ======================
stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")


def to_minor_units(amount_decimal):
    """
    Decimal 12.34 -> 1234 (agorot/cents)
    """
    return int(round(float(amount_decimal) * 100))


class CreateDonationIntentSerializer(serializers.Serializer):
    donation_id = serializers.IntegerField()


# ======================
# Donation Campaigns
# ======================
class DonationCampaignViewSet(viewsets.ModelViewSet):
    queryset = DonationCampaign.objects.all().order_by("-created_at")
    serializer_class = DonationCampaignSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOrganization()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = DonationCampaign.objects.all().order_by("-created_at")
        user = getattr(self.request, "user", None)

        if not user or not user.is_authenticated:
            return qs.filter(is_active=True)

        if user.role == user.Role.ORG:
            return qs.filter(organization=user)

        if user.role == user.Role.ADMIN:
            return qs

        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user)


# ======================
# Donations
# ======================
class DonationViewSet(viewsets.ModelViewSet):
    serializer_class = DonationSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]

        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]

        if self.action in ["update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOrganization()]

        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Donation.objects.select_related(
            "organization", "campaign", "donor_user"
        ).order_by("-created_at")

        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return Donation.objects.none()

        if user.role == user.Role.ORG:
            return qs.filter(organization=user)

        if user.role == user.Role.ADMIN:
            return qs

        return qs.filter(donor_user=user)

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated:
            serializer.save(donor_user=user)
        else:
            serializer.save()


# ======================
# Stripe: Create PaymentIntent for Donation
# POST /api/payments/donations/create-intent/
# body: { "donation_id": 123 }
# returns: { "client_secret": "..." }
# ======================
class CreateDonationPaymentIntent(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # ✅ ודאי שיש לך STRIPE_SECRET_KEY
        if not getattr(settings, "STRIPE_SECRET_KEY", ""):
            return Response(
                {"detail": "Stripe is not configured (missing STRIPE_SECRET_KEY)"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        ser = CreateDonationIntentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        donation_id = ser.validated_data["donation_id"]

        try:
            donation = Donation.objects.select_related("organization", "campaign").get(id=donation_id)
        except Donation.DoesNotExist:
            return Response({"detail": "Donation not found"}, status=status.HTTP_404_NOT_FOUND)

        # אם כבר שולם – לא יוצרים שוב
        if getattr(donation, "status", "") == "PAID":
            return Response({"detail": "Donation already paid"}, status=status.HTTP_400_BAD_REQUEST)

        # אם יש כבר intent – נחזיר client_secret
        if getattr(donation, "stripe_payment_intent_id", ""):
            try:
                intent = stripe.PaymentIntent.retrieve(donation.stripe_payment_intent_id)
                cs = intent.get("client_secret")
                if cs:
                    return Response({"client_secret": cs})
            except StripeError as e:
                # ✅ מחזיר שגיאה קריאה מה-Stripe
                return Response(
                    {"detail": "Stripe error retrieving PaymentIntent", "stripe": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                # אם משהו נשבר/intent לא קיים - ננקה וניצור חדש
                donation.stripe_payment_intent_id = ""
                donation.save(update_fields=["stripe_payment_intent_id"])

        # ✅ יצירת PaymentIntent עם טיפול בשגיאות
        try:
            intent = stripe.PaymentIntent.create(
                amount=to_minor_units(donation.amount),
                currency=(getattr(donation, "currency", None) or "ils"),
                automatic_payment_methods={"enabled": True},
                metadata={
                    "donation_id": str(donation.id),
                    "org_id": str(donation.organization_id or ""),
                    "campaign_id": str(donation.campaign_id or ""),
                },
            )
        except StripeError as e:
            return Response(
                {"detail": "Stripe error creating PaymentIntent", "stripe": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": "Server error creating PaymentIntent", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # עדכון בדאטהבייס
        donation.stripe_payment_intent_id = intent.get("id", "")
        donation.stripe_payment_status = intent.get("status", "")
        donation.status = "PENDING"
        donation.save()

        cs = intent.get("client_secret")
        if not cs:
            return Response(
                {"detail": "Stripe did not return client_secret"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"client_secret": cs})


# ======================
# Stripe Webhook
# POST /api/payments/stripe/webhook/
# ======================
@csrf_exempt
def stripe_webhook(request):
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        return HttpResponse(status=500)

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=webhook_secret,
        )
    except Exception:
        return HttpResponse(status=400)

    event_type = event.get("type", "")
    data_object = (event.get("data") or {}).get("object") or {}

    if event_type in ("payment_intent.succeeded", "payment_intent.payment_failed"):
        donation_id = ((data_object.get("metadata") or {}).get("donation_id")) or None

        if donation_id:
            try:
                donation = Donation.objects.get(id=int(donation_id))
                donation.stripe_payment_status = data_object.get("status", "")
                donation.status = "PAID" if event_type == "payment_intent.succeeded" else "FAILED"
                donation.save()
            except Donation.DoesNotExist:
                pass

    return HttpResponse(status=200)
