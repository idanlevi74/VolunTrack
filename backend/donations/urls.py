# donations/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DonationCampaignViewSet, DonationViewSet, CreateDonationPaymentIntent, stripe_webhook

router = DefaultRouter()
router.register("donation-campaigns", DonationCampaignViewSet, basename="donation-campaigns")
router.register("donations", DonationViewSet, basename="donations")

urlpatterns = [
    path("", include(router.urls)),
    path("payments/donations/create-intent/", CreateDonationPaymentIntent.as_view()),
    path("payments/stripe/webhook/", stripe_webhook),
]
