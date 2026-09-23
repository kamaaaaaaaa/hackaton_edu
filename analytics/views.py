import json

from django.db.models import Count
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from authapi.auth import get_token_from_request

from .models import AnalyticsEvent


def _parse_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8')), None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({'error': 'Некорректный JSON'}, status=400)


@csrf_exempt
@require_http_methods(['POST'])
def track(request):
    payload, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Некорректный JSON'}, status=400)

    event_type = str(payload.get('event', '') or '').strip()
    if not event_type:
        return JsonResponse({'error': 'Укажите event'}, status=400)

    meta = payload.get('meta', {})
    if meta is None:
        meta = {}
    if not isinstance(meta, dict):
        return JsonResponse({'error': 'meta должно быть объектом'}, status=400)

    AnalyticsEvent.objects.create(event_type=event_type, meta=meta)

    return JsonResponse({'ok': True}, status=201)


@csrf_exempt
@require_http_methods(['GET'])
def summary(request):
    token, error_message = get_token_from_request(request)
    if error_message:
        return JsonResponse({'error': error_message}, status=401)
    if not token.user.is_staff:
        return JsonResponse({'error': 'Доступ только для администраторов'}, status=403)

    now = timezone.now()
    since = now - timezone.timedelta(hours=24)

    total_events = AnalyticsEvent.objects.count()
    last_24h = AnalyticsEvent.objects.filter(created_at__gte=since).count()

    by_event_type = {}
    counts = (
        AnalyticsEvent.objects.values('event_type')
        .order_by()
        .annotate(count=Count('id'))
    )
    for row in counts:
        by_event_type[row['event_type']] = row['count']

    return JsonResponse(
        {
            'totalEvents': total_events,
            'byEventType': by_event_type,
            'last24h': last_24h,
            'generatedAt': now.isoformat().replace('+00:00', 'Z'),
        },
        status=200,
    )
