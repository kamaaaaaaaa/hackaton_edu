# Hackathon Base

A generic Django starter for hackathon projects. This is a placeholder name —
rename it once the hackathon idea is picked.

## What's included

- Django 6.1.1 with a custom user model
- A `core` app and a Bootstrap-based base template
- Settings configured via `django-environ` (`.env` file, not committed)
- Static files served in production via `whitenoise`
- Database URL configuration via `dj-database-url` (Postgres-ready)
- Render-ready: `Procfile`, `render.yaml` blueprint, and a GitHub Actions CI
  workflow that runs `python manage.py test` on every push/PR

## Local setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Then open http://127.0.0.1:8000/ in your browser.

## Docker (Windows/any OS)

No local Python/venv/PostgreSQL setup needed — Docker runs the whole stack
(Django + Postgres) with one command, the same way on Windows, Mac, or Linux.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   (includes Docker Compose).
2. From the project root:

   ```bash
   cp .env.example .env
   ```

   Fill in `SECRET_KEY` in `.env` (you can leave `ALLOWED_HOSTS` as
   `localhost,127.0.0.1`). `DATABASE_URL` is set automatically by
   `docker-compose.yml` to point at the containerized Postgres database, so
   you don't need to add it yourself.
3. Build and start everything:

   ```bash
   docker compose up --build
   ```

   This starts a `db` (Postgres) container and a `web` (Django) container,
   runs migrations automatically, and serves the app at
   http://localhost:8000.
4. Create an admin account (in another terminal, while the stack is running):

   ```bash
   docker compose exec web python manage.py createsuperuser
   ```
5. To stop the stack:

   ```bash
   docker compose down
   ```

   To stop it **and** wipe the Postgres data volume (fresh database next
   time):

   ```bash
   docker compose down -v
   ```

Code changes on the host are picked up live by the dev server, same as
running `manage.py runserver` locally — no rebuild needed unless you change
`requirements.txt` or the `Dockerfile`.

## Deployment

### Push the code to GitHub

These are the commands *you* run yourself once the local project is ready
and committed:

1. Create a new (empty) repository on GitHub via the web UI at
   https://github.com/new (do not initialize it with a README, .gitignore,
   or license — this project already has them).
2. Then, from this project directory, run:

   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git branch -M main
   git push -u origin main
   ```

### Deploy on Render

1. Go to https://dashboard.render.com and sign in (or sign up).
2. Click **New** > **Blueprint**.
3. Select the GitHub repository you just pushed. Render will detect and read
   the `render.yaml` file in the project root automatically.
4. Review the resources it proposes (one free-plan web service and one
   free-plan Postgres database) and click **Apply**.
5. Once the service is created, open its **Environment** tab and update the
   `ALLOWED_HOSTS` variable to match the `*.onrender.com` domain Render
   assigned to your service (shown at the top of the service dashboard).
6. Trigger a redeploy (or push a new commit) so the updated `ALLOWED_HOSTS`
   takes effect.

The `SECRET_KEY` is generated automatically by Render, `DEBUG` is set to
`false`, and `DATABASE_URL` is wired to the managed Postgres database — no
manual configuration needed for those three.
