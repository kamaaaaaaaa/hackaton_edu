import json

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .auth import get_token_from_request
from .models import AuthToken

User = get_user_model()


def _parse_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8')), None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({'error': 'Некорректный JSON'}, status=400)


def _user_data(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'isStaff': user.is_staff,
    }


@csrf_exempt
@require_http_methods(['POST'])
def register(request):
    payload, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Некорректный JSON'}, status=400)

    username = str(payload.get('username', '')).strip()
    email = str(payload.get('email', '') or '').strip()
    password = payload.get('password', '') or ''

    if not username:
        return JsonResponse({'error': 'Укажите имя пользователя'}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Это имя пользователя уже занято'}, status=400)

    try:
        validate_password(password)
    except ValidationError as exc:
        return JsonResponse({'error': exc.messages[0]}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    token = AuthToken.objects.create(user=user)

    return JsonResponse(
        {'user': _user_data(user), 'token': token.key},
        status=201,
    )


@csrf_exempt
@require_http_methods(['POST'])
def login_view(request):
    payload, error_response = _parse_json_body(request)
    if error_response:
        return error_response

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Некорректный JSON'}, status=400)

    username = str(payload.get('username', '')).strip()
    password = payload.get('password', '') or ''

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Неверный логин или пароль'}, status=401)

    if not user.check_password(password):
        return JsonResponse({'error': 'Неверный логин или пароль'}, status=401)

    # A fresh token every login (never reused/invalidated) so multiple
    # devices can stay logged in independently.
    token = AuthToken.objects.create(user=user)

    return JsonResponse(
        {'user': _user_data(user), 'token': token.key},
        status=200,
    )


@csrf_exempt
@require_http_methods(['POST'])
def logout_view(request):
    token, error = get_token_from_request(request)
    if error:
        return JsonResponse({'error': error}, status=401)

    token.delete()
    return JsonResponse({'ok': True}, status=200)


@csrf_exempt
@require_http_methods(['GET'])
def me(request):
    token, error = get_token_from_request(request)
    if error:
        return JsonResponse({'error': error}, status=401)

    return JsonResponse({'user': _user_data(token.user)}, status=200)
