from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import AssemblyPoint


def _point_data(point):
    return {
        'id': point.id,
        'district': point.district,
        'name': point.name,
        'address': point.address,
        'lat': point.lat,
        'lng': point.lng,
        'type': point.type,
        'source': point.source,
        'geocodeConfidence': point.geocode_confidence,
        'needsReview': point.needs_review,
        'geocodeMethod': point.geocode_method,
        'geocodeProvider': point.geocode_provider,
        'geocodeNote': point.geocode_note,
    }


@csrf_exempt
@require_http_methods(['GET'])
def list_points(request):
    points = AssemblyPoint.objects.order_by('id')
    return JsonResponse([_point_data(point) for point in points], safe=False, status=200)
