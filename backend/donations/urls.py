from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DonationCampaignViewSet, DonationViewSet

router = DefaultRouter()
router.register(r"donation-campaigns", DonationCampaignViewSet, basename="donation-campaigns")
router.register(r"donations", DonationViewSet, basename="donations")

urlpatterns = [
    path("", include(router.urls)),
]
