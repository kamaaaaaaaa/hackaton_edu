# Hackathon Base

Минимальный Django-каркас: кастомная модель пользователя, регистрация и вход,
окружение под локальную разработку и деплой на Render. Прежняя тема проекта
("AntiВыгорание") снята — весь специфичный функционал удалён, остался только
базовый костяк под новую тему хакатона.

## Стек

- Django 6.1 + SQLite (локально) / PostgreSQL (на Render)
- Django templates, Bootstrap 5
- django-environ для настроек из `.env`

## Установка

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Откроется на `http://127.0.0.1:8000/`.

## Переменные окружения

См. `.env.example`: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`. В продакшене
(Render) `DATABASE_URL` подставляется автоматически из привязанной базы.

## Docker (Windows/любая ОС)

```bash
cp .env.example .env
docker compose up --build
```

Откроется на `http://localhost:8000`. `docker compose exec web python manage.py createsuperuser`
для админ-аккаунта, `docker compose down -v` — остановить и стереть базу.

## Деплой

Настроен `render.yaml` (Blueprint): веб-сервис + Postgres на бесплатном тарифе.
Подробности — в `DEPLOYMENT.md`.
