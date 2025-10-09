"""
URL configuration for app project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from ai_review.urls import router as ai_review_router
from app.settings import PAYMENT_ENABLED
from app.social_login import CustomGoogleOAuthView
from bibliography.urls import router as bibliography_router
from documents.urls import router as document_router
from dwh.urls import router as dwh_router
from general.urls import router as general_router
from kernel.urls import router as kernel_router
from users.urls import router as user_router

admin.site.site_header = "Dora Administration"
admin.site.site_title = "Dora Administration"

api_v1_urls = [
    path("templates/", include(kernel_router.urls)),
    path("documents/", include(document_router.urls)),
    path("dwh/", include(dwh_router.urls)),
    path("users/", include(user_router.urls)),
    path("bibliographies/", include(bibliography_router.urls)),
    path("ai_review/", include(ai_review_router.urls)),
    path("auth/social/google/", CustomGoogleOAuthView.as_view(), name="google_login"),
    path("", include(general_router.urls)),
]

if PAYMENT_ENABLED:
    api_v1_urls.append(path("payments/", include("payment.urls")))

urlpatterns = [
    path("api/v1/", include(api_v1_urls)),
    path("admin/", admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [
        path("api/schema", SpectacularAPIView.as_view(), name="schema"),
        path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]
