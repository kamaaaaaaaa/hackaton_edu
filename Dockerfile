FROM python:3.12-slim

# Prevent Python from writing .pyc files and buffering stdout/stderr,
# which keeps logs flowing immediately in `docker compose logs`.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps needed to build psycopg2-binary / Django on slim images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Local development server (not gunicorn) — the project directory is
# volume-mounted over this in docker-compose.yml so host edits are live.
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
