# CrewGO

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-00C7B7?logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3_70B-F55036?logo=groq&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

> **AI-powered crew coordination for real-world events in Lahore, Pakistan.**
> Get matched into a small crew (max 6), go out together, and capture the moment.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quickstart](#quickstart)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Background Tasks](#background-tasks)
- [Deployment](#deployment)

---

## Overview

CrewGO is a production-grade FastAPI backend for a local event discovery and AI-powered social coordination app. Users browse real events happening in Lahore, express interest, and get auto-matched into small crews of 3–6 people with compatible vibes. Groq's Llama 3 70B powers the conversational layer — icebreakers, daily prompts, and post-event reflections. After the event, multi-perspective clips are stitched into a crew reel via FFmpeg and stored on Cloudflare R2.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile Client (React Native / Expo)          │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTPS / REST
┌───────────────────────────▼─────────────────────────────────────┐
│                       FastAPI Application                       │
│                                                                 │
│  /api/v1/auth   /api/v1/users   /api/v1/events                  │
│  /api/v1/crews  /api/v1/chat    /api/v1/reels                   │
│                                                                 │
│  ┌──────────────────────┐   ┌──────────────────────────────┐   │
│  │  Matching Engine     │   │  APScheduler                 │   │
│  │  (Jaccard Similarity)│   │  - Event sync every 2h       │   │
│  │  Auto crew formation │   │  - Daily prompts @ 9am PKT   │   │
│  └──────────────────────┘   └──────────────────────────────┘   │
└──────┬──────────┬────────────────┬──────────────────────────────┘
       │          │                │
┌──────▼──────┐ ┌─▼──────────┐ ┌──▼───────────────┐
│  Supabase   │ │  Groq API  │ │  Cloudflare R2   │
│ (Auth + DB) │ │ Llama3 70B │ │  (Media Storage) │
│   + RLS     │ └─────┬──────┘ └──────────────────┘
└─────────────┘       │
                ┌─────▼──────┐  ┌─────────────┐  ┌─────────────┐
                │  Firebase  │  │  Eventbrite │  │   FFmpeg    │
                │    FCM     │  │  + G.Places │  │  (Reels)    │
                └────────────┘  └─────────────┘  └─────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **AI Crew Matching** | Jaccard similarity scoring on interest tags; auto-forms crews when 3+ users RSVP the same event |
| **Groq Icebreakers** | Llama 3 70B generates personalized openers for each crew on formation |
| **Daily AI Prompts** | Groq conversation starters pushed to active crews at 9am PKT daily |
| **Post-Event Reflections** | AI reflection prompts sent 2h after event end time |
| **Crew Reel Stitching** | FFmpeg merges multi-perspective clips uploaded by crew members into one reel |
| **Event Discovery** | Eventbrite API + Google Places sync with local Lahore filtering |
| **Background Scheduler** | APScheduler handles event sync (2h), daily prompts, crew auto-formation |
| **JWT Auth + RLS** | Supabase JWT auth with Row-Level Security enforced at DB level |
| **Push Notifications** | Firebase Admin SDK (FCM) for crew activity and event reminders |
| **Cloud Storage** | Cloudflare R2 for all media (clips, avatars, finished reels) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Python 3.11 |
| Framework | FastAPI 0.110+ |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Auth | Supabase Auth (JWT) |
| AI / LLM | Groq API — `llama3-70b-8192` |
| Event Data | Eventbrite API + Google Places API |
| Storage | Cloudflare R2 (S3-compatible via boto3) |
| Push Notifications | Firebase Admin SDK (FCM) |
| Video Processing | FFmpeg (via ffmpeg-python) |
| Task Scheduler | APScheduler (in-process, no Redis needed) |
| Email | Resend API |
| Containerization | Docker + Docker Compose |
| Testing | pytest + pytest-asyncio + httpx |

---

## Project Structure

```
crewgo-backend/
├── app/
│   ├── main.py                    # FastAPI app entry point, lifespan, CORS
│   ├── config.py                  # Pydantic Settings (loads .env)
│   ├── dependencies.py            # Shared FastAPI deps (current user, DB client)
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py            # Register, login, refresh, logout
│   │       ├── users.py           # Profile CRUD, interest tags, FCM token
│   │       ├── events.py          # Discovery feed, interest toggle, admin sync
│   │       ├── crews.py           # Crew formation, join/leave, icebreakers
│   │       ├── chat.py            # Messages, AI daily prompt trigger
│   │       └── reels.py           # Upload clip, stitch, get reel URL
│   │
│   ├── core/
│   │   ├── security.py            # JWT encode/decode, password hashing
│   │   ├── exceptions.py          # Custom exception handlers
│   │   └── logging.py             # Structured logging config
│   │
│   ├── services/
│   │   ├── matching.py            # Jaccard similarity + crew auto-formation
│   │   ├── ai_service.py          # Groq client, prompt builder
│   │   ├── reel_service.py        # FFmpeg pipeline (stitch + upload)
│   │   ├── eventbrite.py          # Eventbrite API sync
│   │   ├── places.py              # Google Places venue search
│   │   ├── firebase.py            # FCM push notifications
│   │   ├── storage.py             # R2 upload/download/presigned URLs
│   │   └── email_service.py       # Resend transactional email
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── event.py
│   │   ├── crew.py
│   │   ├── chat.py
│   │   └── reel.py
│   │
│   ├── db/
│   │   ├── client.py              # Supabase client singleton
│   │   └── migrations/
│   │       └── 001_initial.sql    # Full schema with RLS policies
│   │
│   └── tasks/
│       ├── scheduler.py           # APScheduler setup + job registration
│       ├── event_sync.py          # Eventbrite/Places sync job
│       ├── daily_prompts.py       # 9am PKT Groq prompt job
│       ├── auto_formation.py      # Crew auto-formation job
│       └── reel_cleanup.py        # Expire old reels job
│
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_events.py
│   ├── test_crews.py
│   ├── test_matching.py
│   └── test_reels.py
│
├── firebase-credentials.json      # NOT committed — add to .gitignore
├── .env                           # NOT committed
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## Quickstart

### Prerequisites

- Python 3.11+
- Docker + Docker Compose (recommended)
- Supabase project ([supabase.com](https://supabase.com))
- Groq API key ([console.groq.com](https://console.groq.com))
- Firebase service account JSON

### Option A — Docker (Recommended)

```bash
git clone https://github.com/your-org/crewgo.git
cd crewgo

cp .env.example .env
# Open .env and fill in all values

docker-compose up --build
```

| Endpoint | URL |
|---|---|
| API Base | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |

### Option B — Local (No Docker)

```bash
git clone https://github.com/your-org/crewgo.git
cd crewgo

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Open .env and fill in all values

uvicorn app.main:app --reload --port 8000
```

### Running Tests

```bash
pytest tests/ -v --cov=app --cov-report=term-missing
```

---

## API Reference

### Authentication — `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | No | Register a new user |
| `POST` | `/api/v1/auth/login` | No | Login, returns access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | No | Exchange refresh token for new access token |
| `POST` | `/api/v1/auth/logout` | JWT | Invalidate session |
| `GET` | `/api/v1/auth/me` | JWT | Get current user info |

### Users — `/api/v1/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/users/profile` | JWT | Get current user profile |
| `PUT` | `/api/v1/users/profile` | JWT | Update name, bio, avatar |
| `PUT` | `/api/v1/users/interests` | JWT | Update interest tags (used for matching) |
| `PUT` | `/api/v1/users/fcm-token` | JWT | Register device FCM token |
| `GET` | `/api/v1/users/{user_id}` | JWT | Get public user profile |
| `DELETE` | `/api/v1/users/account` | JWT | Deactivate account |

### Events — `/api/v1/events`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/events` | JWT | Personalized event feed (city, date, category filters) |
| `GET` | `/api/v1/events/{event_id}` | JWT | Event detail |
| `POST` | `/api/v1/events/{event_id}/interest` | JWT | Express interest (triggers crew matching) |
| `DELETE` | `/api/v1/events/{event_id}/interest` | JWT | Withdraw interest |
| `GET` | `/api/v1/events/{event_id}/interested-users` | JWT | List interested users |
| `POST` | `/api/v1/events/sync` | Admin | Manually trigger Eventbrite sync |

### Crews — `/api/v1/crews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/crews/my-crews/list` | JWT | List user's active crews |
| `GET` | `/api/v1/crews/{crew_id}` | JWT | Get crew detail + member list |
| `POST` | `/api/v1/crews/{crew_id}/join` | JWT | Request to join a crew |
| `POST` | `/api/v1/crews/{crew_id}/invite` | JWT | Invite another user to crew |
| `PUT` | `/api/v1/crews/{crew_id}/status` | JWT | Update RSVP status |
| `POST` | `/api/v1/crews/{crew_id}/complete` | JWT | Mark crew event as completed |
| `GET` | `/api/v1/crews/{crew_id}/icebreaker` | JWT | Get Groq-generated icebreaker for crew |
| `GET` | `/api/v1/crews/events/{event_id}/suggested-crew` | JWT | Get AI crew suggestion for event |

### Chat — `/api/v1/crews/{crew_id}`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/crews/{crew_id}/messages` | JWT | Paginated chat history |
| `POST` | `/api/v1/crews/{crew_id}/messages` | JWT | Send message |
| `POST` | `/api/v1/crews/{crew_id}/messages/trigger-ai-prompt` | JWT | Manually trigger today's AI prompt |

### Reels — `/api/v1/reels`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/reels/{crew_id}/upload-clip` | JWT | Upload clip (returns presigned R2 URL) |
| `POST` | `/api/v1/reels/{crew_id}/stitch` | JWT | Trigger FFmpeg stitching job |
| `GET` | `/api/v1/reels/{reel_id}` | JWT | Get reel metadata + CDN URL |
| `GET` | `/api/v1/reels/crews/{crew_id}/reel` | JWT | Get crew's latest finished reel |

### Example Requests

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123", "full_name": "Ali Raza", "city": "Lahore"}'

# Express interest in an event
curl -X POST http://localhost:8000/api/v1/events/EVENT_UUID/interest \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get AI icebreaker for a crew
curl http://localhost:8000/api/v1/crews/CREW_UUID/icebreaker \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | — | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Supabase service role key (server-side only) |
| `GROQ_API_KEY` | Yes | — | Groq API key |
| `GROQ_MODEL` | No | `llama3-70b-8192` | Groq model ID |
| `EVENTBRITE_API_KEY` | Yes | — | Eventbrite OAuth token |
| `GOOGLE_PLACES_API_KEY` | Yes | — | Google Places API key |
| `R2_ACCOUNT_ID` | Yes | — | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Yes | — | R2 S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | Yes | — | R2 S3-compatible secret key |
| `R2_BUCKET_NAME` | Yes | — | R2 bucket name |
| `R2_PUBLIC_URL` | Yes | — | Public CDN URL for R2 bucket |
| `FIREBASE_CREDENTIALS_PATH` | Yes | `./firebase-credentials.json` | Path to Firebase service account JSON |
| `RESEND_API_KEY` | Yes | — | Resend email API key |
| `FROM_EMAIL` | Yes | — | Sender email address |
| `APP_NAME` | No | `Crewgo` | Application name |
| `APP_ENV` | No | `development` | `development` / `production` |
| `SECRET_KEY` | Yes | — | JWT signing secret (min 32 chars; `openssl rand -hex 32`) |
| `ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Access token TTL in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `30` | Refresh token TTL in days |
| `DEFAULT_CITY` | No | `Lahore` | Default city for event discovery |

---

## Background Tasks

APScheduler runs the following jobs in-process (no Redis/Celery required):

| Job | Schedule | Description |
|---|---|---|
| `sync_eventbrite_events` | Every 2 hours | Pulls new and updated events from Eventbrite for `DEFAULT_CITY` |
| `send_daily_prompts` | Daily at 09:00 PKT | Generates Groq conversation prompts and pushes via FCM to active crews |
| `auto_form_crews` | Every 30 minutes | Forms new crews when 3+ users share interest in the same event |
| `send_post_event_reflections` | 2h after event end | Sends Groq-powered reflection prompts to crew members |
| `cleanup_expired_reels` | Daily at 02:00 PKT | Deletes R2 objects and DB records for reels older than 30 days |

---

## Deployment

### Railway (Recommended)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Set all environment variables in the Railway dashboard under **Variables**.
For `FIREBASE_CREDENTIALS_PATH`, upload the JSON file and set the path, or encode the JSON to a `FIREBASE_CREDENTIALS_JSON` env var and update `firebase.py` to read from it.

### Render

1. Connect your GitHub repo to Render
2. Select **Web Service**, runtime: **Docker**
3. Add all env vars from `.env.example` in the **Environment** panel
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Production Docker

```bash
docker build -t crewgo:latest .
docker run -d \
  --env-file .env \
  -p 8000:8000 \
  --name crewgo \
  crewgo:latest
```

### Production Considerations

- Set `APP_ENV=production`
- Use a strong `SECRET_KEY` (minimum 32 chars, randomly generated)
- Set explicit CORS origins (not `*`) for your mobile app domain
- Run with Gunicorn + Uvicorn workers: `gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4`
- Add a reverse proxy (Nginx/Caddy) for TLS termination
- Monitor APScheduler job failures with Sentry or equivalent

---

## License

MIT — see [LICENSE](LICENSE) for details.
