import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from authapi.auth import get_token_from_request

from .models import ChecklistProgress

MAX_KEYS = 200
MAX_KEY_LENGTH = 100


def _parse_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8')), None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({'error': 'Некорректный JSON'}, status=400)


def _iso(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%S.') + f'{dt.microsecond // 1000:03d}Z'


def _progress_data(progress):
    if progress is None:
        return {'checked': {}, 'updatedAt': None}
    return {'checked': progress.checked, 'updatedAt': _iso(progress.updated_at)}


@csrf_exempt
@require_http_methods(['GET', 'PATCH'])
def checklist_view(request):
    token, error = get_token_from_request(request)
    if error:
        return JsonResponse({'error': error}, status=401)

    if request.method == 'GET':
        progress = ChecklistProgress.objects.filter(user=token.user).first()
        return JsonResponse(_progress_data(progress), status=200)

    # PATCH: full replace of `checked`.
    payload, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Некорректный JSON'}, status=400)

    checked = payload.get('checked')
    if not isinstance(checked, dict):
        return JsonResponse({'error': 'checked должен быть объектом'}, status=400)

    for value in checked.values():
        if not isinstance(value, bool):
            return JsonResponse(
                {'error': 'Значения checked должны быть true/false'}, status=400
            )

    if len(checked) > MAX_KEYS or any(len(str(key)) > MAX_KEY_LENGTH for key in checked):
        return JsonResponse({'error': 'Слишком много пунктов'}, status=400)

    progress, _created = ChecklistProgress.objects.update_or_create(
        user=token.user,
        defaults={'checked': checked},
    )

    return JsonResponse(_progress_data(progress), status=200)
