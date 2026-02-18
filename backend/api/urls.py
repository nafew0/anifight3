"""
URL configuration for API endpoints
"""
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import content_views

app_name = 'api'

urlpatterns = [
    # Game endpoints (public - with visibility filtering)
    path('templates/', views.list_templates, name='list_templates'),
    path('anime/', views.list_anime, name='list_anime'),
    path('characters/', views.list_characters, name='list_characters'),
    path('draw/', views.draw_character, name='draw_character'),
    path('score/', views.calculate_score, name='calculate_score'),

    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/me/', views.get_current_user, name='current_user'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Google OAuth endpoints (provided by dj-rest-auth)
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    path('auth/social/', include('allauth.socialaccount.urls')),

    # User-specific endpoints (requires authentication)
    path('my/templates/', content_views.my_templates_list, name='my_templates_list'),
    path('my/templates/<int:pk>/', content_views.my_template_detail, name='my_template_detail'),

    path('my/anime/', content_views.my_anime_list, name='my_anime_list'),
    path('my/anime/<int:pk>/', content_views.my_anime_detail, name='my_anime_detail'),
    path('my/anime/import/<int:pk>/', content_views.import_anime, name='import_anime'),

    path('my/anime/<int:anime_id>/characters/', content_views.my_anime_characters, name='my_anime_characters'),
    path('my/anime/<int:anime_id>/characters/<int:char_id>/', content_views.my_anime_character_detail, name='my_anime_character_detail'),

    # Public library endpoints
    path('library/anime/', content_views.library_anime_list, name='library_anime_list'),
    path('library/anime/<int:pk>/', content_views.library_anime_detail, name='library_anime_detail'),

    # Rating endpoints (requires authentication)
    path('library/anime/<int:pk>/rate/', content_views.rate_anime, name='rate_anime'),
    path('library/anime/<int:pk>/my-rating/', content_views.my_anime_rating, name='my_anime_rating'),

    # Multiplayer endpoints
    path('multiplayer/', include('multiplayer.urls')),
]
