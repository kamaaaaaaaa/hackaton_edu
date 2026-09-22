# AntiВыгорание

A MedTech hackathon MVP that helps students notice the early signs of
burnout before they snowball. Every day you leave a short check-in (mood,
energy, stress, sleep); the app quietly compares that against **your own**
personal baseline — never against other people or a fixed scale — and
flags a *sustained* move away from your normal range, not a single bad
day. When something looks off, it shows an AI-backed (with a solid
rule-based fallback) suggestion, points you at a relevant article, and
gives you one tap to breathing exercises or crisis contacts if you need
them right now. **AntiВыгорание is explicitly not a medical or diagnostic
tool** — it never claims to diagnose anything, and it says so on every
page.

## Features

- **Custom auth** with a user-type signup (school student / university
  student / adult) — `accounts`
- **Daily check-ins** (mood, energy, stress, sleep) via a fast tap-through
  widget on the home page — `checkins`
- **Personal-baseline burnout detection**: your own history sets your
  "normal," and the status pill only escalates on a *sustained* decline —
  never from one rough day — `checkins/services.py`
- **Event calendar + forecast**: flag an exam/deadline ahead of time and
  the app learns, from your own past events, how many days before this
  kind of event your stress typically starts climbing — `events`
- **Progress page** with Chart.js trend lines (14/30 days), a week
  summary, a sleep-vs-stress pattern (once there's enough data on both
  sides), a check-in streak, and your weekly survey history — `core`
- **AI assistant** with daily, explained recommendations, backed by
  Anthropic's API when a key is configured and a genuinely useful
  rule-based fallback when it isn't (see Setup below) — `assistant`
- **14 articles** on sleep, stress, burnout, and asking for help, plus a
  quick-help page (box-breathing exercise, a 5-minute pause) and a calm,
  always-one-tap-away crisis page — `articles`, `safety`
- **Weekly CBI (Copenhagen Burnout Inventory) survey** — `surveys`
- **Group / org dashboard**: join a class or team by invite code and see
  *anonymous, aggregate-only* weekly averages — the dashboard only ever
  renders once enough distinct people have checked in that week
  (`ORG_DASHBOARD_MIN_WEEKLY_CHECKINS`, default 5), so a single person's
  data is never effectively exposed — `groups`
- **"My data"** page: see exactly what's stored about you, and delete all
  of it in one confirmed action — `accounts`
- Installable as a **PWA** (manifest + icons, `static/manifest.json`)

## Local setup

```bash
python3 -m venv venv
source venv/bin/activate      # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo    # creates the demo account + demo data, see below
python manage.py runserver
```

Then open http://127.0.0.1:8000/ in your browser.

### Environment variables (`.env`)

Copy `.env.example` to `.env` and fill in:

| Var | Required? | Notes |
|---|---|---|
| `SECRET_KEY` | yes | generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | yes | `True` locally |
| `ALLOWED_HOSTS` | yes | `localhost,127.0.0.1` locally |
| `DATABASE_URL` | no | defaults to local sqlite when unset; set in production for Postgres |
| `ANTHROPIC_API_KEY` | **no** | the AI assistant works fine with **no key set at all** — it falls back to a rule-based recommendation engine that reads your recent check-ins directly (see `assistant/services.py`). Set this to a real Anthropic API key to get live, model-generated recommendations instead. |
| `AI_MODEL` | no | defaults to `claude-haiku-4-5-20251001`; only relevant if `ANTHROPIC_API_KEY` is set |

### Demo data (`seed_demo`)

```bash
./venv/bin/python manage.py seed_demo
```

This creates a full, realistic demo dataset in one command:

- A **demo student** account with 30 days of check-in history: ~20 stable,
  good days followed by ~10 days of a simulated pre-exam decline (rising
  stress, falling sleep and mood) — enough for the personal-baseline
  detector to genuinely escalate the status pill on the home page.
- Two events for that student (a past exam with a real stress rise
  beforehand, and an upcoming exam ~10 days out), so the event-forecast
  feature has real history to compute from.
- Two weekly-survey entries, the most recent one dated far enough back
  that the weekly-survey reminder is due again right after seeding.
- A demo group ("Демо-группа") with 8 member accounts, each checked in
  this week, so the org dashboard clears its privacy threshold and shows
  real aggregate numbers instead of the "not enough data" placeholder.
  The demo student is also a member of this group.

It's safe to re-run: accounts are reused (`get_or_create`), and the
check-in/event/survey history is deleted and recreated each time so the
dates stay correct relative to "today."

**Demo login:**

```
username: demo_student
password: DemoStudent2026!
```

(The 8 group-member accounts, `demo_member1`–`demo_member8`, all share the
password `DemoMember2026!` — they're just there to populate the group
dashboard and aren't meant to be logged into individually.)

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
4. Seed the demo account (in another terminal, while the stack is running):

   ```bash
   docker compose exec web python manage.py seed_demo
   ```

   Or create your own admin account instead:

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

## Running the tests

```bash
./venv/bin/python manage.py test
```

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
   assigned to your service (shown at the top of the service dashboard). If
   you want live AI-generated recommendations in production, also add
   `ANTHROPIC_API_KEY` there — it's optional, the app works without it.
6. Trigger a redeploy (or push a new commit) so the updated `ALLOWED_HOSTS`
   takes effect.

The `SECRET_KEY` is generated automatically by Render, `DEBUG` is set to
`false`, and `DATABASE_URL` is wired to the managed Postgres database — no
manual configuration needed for those three. See `DEPLOYMENT.md` for the
full environment-variable reference and a pre-deploy checklist.

## Stack

- Django 6.1.1, custom user model (`accounts.User`)
- Settings via `django-environ` (`.env`, not committed)
- Bootstrap 5.3.3 + a custom "Тихий кабинет" theme (`static/css/theme.css`)
- Chart.js for progress charts
- `whitenoise` for static files in production, `dj-database-url` for
  Postgres (sqlite locally)
- Render-ready: `Procfile`, `render.yaml`, GitHub Actions CI running
  `python manage.py test` on every push/PR
