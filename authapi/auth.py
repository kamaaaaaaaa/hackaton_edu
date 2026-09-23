from .models import AuthToken


def get_token_from_request(request):
    """Extract and validate the `Authorization: Token <key>` header.

    Returns (AuthToken, None) on success, or (None, error_message) on
    failure. `error_message` is a short human string suitable for a 401
    JSON body; it does not distinguish "missing" from "invalid" beyond the
    message text, since callers all respond with 401 either way.
    """
    header = request.META.get('HTTP_AUTHORIZATION', '')
    prefix = 'Token '
    if not header.startswith(prefix):
        return None, 'Токен не предоставлен'

    key = header[len(prefix):].strip()
    if not key:
        return None, 'Токен не предоставлен'

    try:
        token = AuthToken.objects.select_related('user').get(key=key)
    except AuthToken.DoesNotExist:
        return None, 'Неверный токен'

    return token, None
