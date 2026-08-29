# LMS — Learning Management System

A full-stack Learning Management System built with **Next.js** and **Strapi**, supporting four user roles with backend-enforced access control, course delivery, progress tracking, auto-graded quizzes, an admin panel, and a blog.

## Live

- **Frontend:** https://learningcentral.vercel.app
- **Backend:** https://learning-management-system-production-6ae0.up.railway.app

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4 — Vercel
- **Backend:** Strapi v5 (TypeScript) — Railway
- **Database:** PostgreSQL (local: Docker · prod: Railway managed)

## Running Locally

**Prerequisites:** Node.js 20+, Docker

### 1. Database

```bash
docker run -d --name lms-db \
  -e POSTGRES_PASSWORD=devpassword123 \
  -e POSTGRES_DB=strapi \
  -p 127.0.0.1:5432:5432 \
  -v lms_pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:17-alpine
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run develop
```

Visit `http://localhost:1337/admin` — first visit prompts you to create the admin account.

### 3. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_STRAPI_URL=http://localhost:1337" > .env.local
npm run dev
```

Visit `http://localhost:3000`.

## Features Completed

- [x] Authentication + role-based access control
- [x] Course management (Admin / Content Manager / Instructor)
- [x] Student enrollment + "My Courses"
- [x] Lesson viewing
- [x] Progress tracking (% per course)
- [x] MCQ quizzes with auto-grading
- [x] Admin dashboard (user roles, stats)
- [x] Blog with draft/publish workflow