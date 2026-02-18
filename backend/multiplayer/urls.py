from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MultiplayerRoomViewSet

router = DefaultRouter()
router.register(r'rooms', MultiplayerRoomViewSet, basename='multiplayer-room')

urlpatterns = [
    path('', include(router.urls)),
]
