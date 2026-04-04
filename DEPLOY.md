# Deploying to Railway

## 1. Prerequisites

- A [Railway](https://railway.app) account
- A [GitHub](https://github.com) account (push this repo there first)
- A [Resend](https://resend.com) account for invite emails (free tier is fine)

## 2. Set up the Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo** → select this repository
3. Railway will detect it as a Node.js project automatically

## 3. Add a PostgreSQL database

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway will create the database and auto-inject `DATABASE_URL` into your service

## 4. Configure environment variables

In your Railway service → **Variables**, add:

| Variable | Value |
|---|---|
| `AUTH_SECRET` | Run `openssl rand -base64 32` to generate |
| `AUTH_URL` | Your Railway public domain, e.g. `https://survey-app.up.railway.app` |
| `RESEND_API_KEY` | From your Resend dashboard |
| `NODE_ENV` | `production` |

`DATABASE_URL` is automatically set by the PostgreSQL plugin — don't add it manually.

## 5. Set the build and start commands

In Railway service → **Settings** → **Build & Deploy**:

| Setting | Value |
|---|---|
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Release command** | `npx prisma migrate deploy` |

`npm run build` runs `prisma generate` (regenerates the client from schema) then `next build`.
The **Release command** applies any pending database migrations before the server starts.

## 6. Deploy

Push to your main branch (or click **Deploy** in Railway). Railway will:
1. Install dependencies
2. Generate the Prisma client (`prisma generate`)
3. Build the Next.js app
4. Run `prisma migrate deploy` to apply schema migrations
5. Start the server

## 7. First run — create your admin account

Once deployed, visit `https://your-app.up.railway.app/setup` to create the first admin account.
This route is only available when no users exist yet.

## Local development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Set up local PostgreSQL (or use Railway's local dev feature)
# Edit .env with your local DATABASE_URL

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

Visit `http://localhost:3000/setup` to create your first admin account locally.
