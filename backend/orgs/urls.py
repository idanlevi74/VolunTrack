from rest_framework.routers import DefaultRouter
from .views import OrganizationProfileViewSet

router = DefaultRouter()
router.register("organizations", OrganizationProfileViewSet, basename="organizations")

urlpatterns = router.urls
