"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
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
from django.contrib import admin
from django.urls import include, path, re_path

from core.views import spa

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('accounts/', include('django.contrib.auth.urls')),
    path('api/groups/', include('groups.urls')),
    path('api/auth/', include('authapi.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/assembly-points/', include('assemblypoints.urls')),
    path('api/checklist/', include('checklist.urls')),
    path('', include('core.urls')),
    # Catch-all: every other path belongs to the React app's client-side
    # router (e.g. /map, /family, /checklist, /login, /register, /dev) —
    # serve the SPA shell and let React Router take it from there. Must
    # stay LAST so it never shadows admin/api/accounts.
    re_path(r'^(?P<path>.*)$', spa),
]
