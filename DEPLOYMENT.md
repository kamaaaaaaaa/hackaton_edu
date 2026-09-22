# Deployment (Render)

## Required environment variables

Set these in the Render dashboard (or see `render.yaml`, which provisions most of them automatically). Reference `.env.example` for local equivalents.

| Var | Notes |
|---|---|
| `SECRET_KEY` | `render.yaml` sets `generateValue: true` so Render generates a random one. Never reuse the local dev fallback (`django-insecure-ci-fallback-change-in-prod`) or the `.env.example` placeholder in production. |
| `DEBUG` | Must be `False` (or unset — `render.yaml` sets it to `false`) in production. Also gates the security-hardening block in `config/settings.py` (see below). |
| `ALLOWED_HOSTS` | Comma-separated host list, e.g. `your-app-name.onrender.com`. `render.yaml` ships a placeholder — update it to match the real Render hostname before/after first deploy. |
| `DATABASE_URL` | Render injects this automatically from the managed Postgres instance defined in `render.yaml` (`hackathon-base-db`). Not needed locally — settings fall back to sqlite when unset. |

## Build / release / start commands

Already defined in `Procfile` and `render.yaml`; no manual action needed beyond confirming they ran:

- **Build**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
- **Release** (runs before each deploy goes live): `python manage.py migrate`
- **Start**: `gunicorn config.wsgi` (`Procfile`'s `web` line additionally logs to stdout with `--log-file -`)

## Pre-deploy checklist

- [ ] Run migrations locally against a copy of prod-like data if there's any doubt: `python manage.py migrate`
- [ ] Run `python manage.py collectstatic --noinput` locally to confirm it succeeds before relying on Render's build step
- [ ] Run the test suite: `python manage.py test`
- [ ] Confirm `ALLOWED_HOSTS` on Render matches the actual `*.onrender.com` hostname (or custom domain)
- [ ] Confirm `DEBUG=False` is set in the Render environment
- [ ] Confirm `SECRET_KEY` on Render is the generated value, not a placeholder/dev fallback

## Security hardening note

`config/settings.py` has a block at the bottom, gated on `if not DEBUG:`, that enables `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, and HSTS (`SECURE_HSTS_SECONDS` + `SECURE_HSTS_INCLUDE_SUBDOMAINS`). These only apply when `DEBUG=False`, so local development (where `DEBUG=True` and there's no HTTPS) is unaffected — you won't get redirect loops or blocked cookies while running `manage.py runserver`. They activate automatically once deployed to Render with `DEBUG=False`, since Render terminates TLS and serves the app over HTTPS.
