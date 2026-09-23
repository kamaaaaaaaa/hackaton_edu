import json
import random
import secrets

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import FamilyGroup, FamilyMember

# Uppercase letters + digits, excluding visually ambiguous characters:
# no 0/O, no 1/I/L.
CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
CODE_LENGTH = 6

VALID_STATUSES = {
    FamilyMember.STATUS_SAFE,
    FamilyMember.STATUS_NO_CONTACT,
    FamilyMember.STATUS_UNKNOWN,
}


def _generate_unique_code():
    while True:
        code = ''.join(random.choices(CODE_ALPHABET, k=CODE_LENGTH))
        if not FamilyGroup.objects.filter(code=code).exists():
            return code


def _generate_unique_token():
    while True:
        token = secrets.token_hex(20)
        if not FamilyMember.objects.filter(token=token).exists():
            return token


def _iso(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%S.') + f'{dt.microsecond // 1000:03d}Z'


def _member_data(member, is_self, include_token=False):
    data = {
        'id': member.id,
        'name': member.name,
        'phone': member.phone,
        'isSelf': is_self,
        'status': member.status,
        'updatedAt': _iso(member.updated_at),
    }
    if include_token:
        data['token'] = member.token
    return data


def _group_data(group):
    return {'code': group.code}


def _parse_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8')), None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({'error': 'Некорректный JSON'}, status=400)


@csrf_exempt
@require_http_methods(['POST'])
def create_group(request):
    payload, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Некорректный JSON'}, status=400)

    name = str(payload.get('name', '')).strip()
    phone = payload.get('phone', '') or ''

    if not name:
        return JsonResponse({'error': 'Укажи имя'}, status=400)

    group = FamilyGroup.objects.create(code=_generate_unique_code())
    member = FamilyMember.objects.create(
        group=group,
        token=_generate_unique_token(),
        name=name,
        phone=phone,
    )

    return JsonResponse(
        {
            'group': _group_data(group),
            'member': _member_data(member, is_self=True, include_token=True),
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(['POST'])
def join_group(request):
    payload, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Некорректный JSON'}, status=400)

    code = str(payload.get('code', '')).strip().upper()
    name = str(payload.get('name', '')).strip()
    phone = payload.get('phone', '') or ''

    if not name:
        return JsonResponse({'error': 'Укажи имя'}, status=400)

    try:
        group = FamilyGroup.objects.get(code=code)
    except FamilyGroup.DoesNotExist:
        return JsonResponse({'error': 'Группа с таким кодом не найдена'}, status=404)

    member = FamilyMember.objects.create(
        group=group,
        token=_generate_unique_token(),
        name=name,
        phone=phone,
    )

    return JsonResponse(
        {
            'group': _group_data(group),
            'member': _member_data(member, is_self=True, include_token=True),
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(['GET'])
def members_list(request, code):
    try:
        group = FamilyGroup.objects.get(code=code.strip().upper())
    except FamilyGroup.DoesNotExist:
        return JsonResponse({'error': 'Группа с таким кодом не найдена'}, status=404)

    members = [
        _member_data(member, is_self=False)
        for member in group.members.order_by('id')
    ]

    return JsonResponse({'group': _group_data(group), 'members': members}, status=200)


@csrf_exempt
@require_http_methods(['PATCH'])
def update_member(request, code, member_id):
    payload, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Некорректный JSON'}, status=400)

    try:
        group = FamilyGroup.objects.get(code=code.strip().upper())
    except FamilyGroup.DoesNotExist:
        return JsonResponse({'error': 'Группа с таким кодом не найдена'}, status=404)

    try:
        member = group.members.get(id=member_id)
    except FamilyMember.DoesNotExist:
        return JsonResponse({'error': 'Участник не найден'}, status=404)

    token = payload.get('token', '')
    if not token or token != member.token:
        return JsonResponse({'error': 'Неверный токен'}, status=403)

    status = payload.get('status', '')
    if status not in VALID_STATUSES:
        return JsonResponse({'error': 'Некорректный статус'}, status=400)

    member.status = status
    member.save(update_fields=['status', 'updated_at'])

    return JsonResponse(_member_data(member, is_self=False), status=200)
