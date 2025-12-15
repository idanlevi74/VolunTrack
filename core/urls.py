from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, EventViewSet, RegistrationViewSet

router = DefaultRouter()
router.register('organizations', OrganizationViewSet, basename='organization')
router.register('events', EventViewSet, basename='event')
router.register('registrations', RegistrationViewSet, basename='registration')

urlpatterns = [
    path('', include(router.urls)),
]
