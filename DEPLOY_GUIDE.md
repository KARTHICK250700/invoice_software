# 🚀 Deployment Guide — Render (Backend) + Netlify (Frontend)

## Overview
- **Backend** → Render Web Service (Free tier) — FastAPI + PostgreSQL
- **Frontend** → Netlify (Free tier) — React + Vite
- **Database** → Already created on Render PostgreSQL ✅

---

## STEP 1 — Push Code to GitHub

> Do this once. All future deploys happen automatically when you push.

1. Go to [github.com](https://github.com) → Create a **New Repository**
   - Name: `car-service-billing`
   - Set to **Private**
   - Do NOT check "Add README"
   - Click **Create repository**

2. Open a terminal in your project folder and run:

```bash
git init
git add .
git commit -m "Initial commit — PostgreSQL + deployment setup"
git remote add origin https://github.com/YOUR_USERNAME/car-service-billing.git
git branch -M main
git push -u origin main
```

> Replace `YOUR_USERNAME` with your GitHub username.

---

## STEP 2 — Deploy Backend to Render

### 2a. Create Web Service

1. Go to [render.com](https://render.com) → **Dashboard**
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your `car-service-billing` repository
5. Fill in these settings:

| Setting | Value |
|---|---|
| Name | `car-service-backend` |
| Region | Oregon (US West) |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Plan | **Free** |

### 2b. Set Environment Variables

In the **Environment** section, add these variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://car_spare_part_billing_user:Wfr3rwxVvygBBIH8zdBJAfnmMFMznZPy@dpg-d7i3ia7aqgkc739lq3d0-a.oregon-postgres.render.com/car_spare_part_billing` |
| `SECRET_KEY` | `6cfb5292e380860f4a81e08918ac32514d3e360fee8933713cbee038bf9caea8` |
| `DEFAULT_ADMIN_USERNAME` | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | `Avan@123` |
| `DEFAULT_ADMIN_EMAIL` | `admin@carservice.com` |
| `COMPANY_NAME` | `Om Murugan Car Service Center` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |

6. Click **"Create Web Service"**
7. Wait for deploy to finish (2–5 minutes)
8. Your backend URL will look like: `https://car-service-backend.onrender.com`

### 2c. Test the Backend

Open in browser: `https://car-service-backend.onrender.com/health`

You should see:
```json
{"status": "healthy", "database": {"status": "healthy"}}
```

---

## STEP 3 — Update Frontend with Backend URL

Once you have your Render backend URL, update these 3 files:

### `frontend/.env.production`
```
VITE_API_URL=https://car-service-backend.onrender.com
```
*(Replace `car-service-backend` with your actual service name)*

### `frontend/vercel.json`
```json
"VITE_API_URL": "https://car-service-backend.onrender.com"
```

### `frontend/netlify.toml`
```toml
VITE_API_URL = "https://car-service-backend.onrender.com"
```

Then commit and push:
```bash
git add .
git commit -m "Update frontend with Render backend URL"
git push
```

---

## STEP 4 — Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → **"Add new site"** → **"Import an existing project"**
2. Connect GitHub → Select `car-service-billing`
3. Fill in build settings:

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `frontend/dist` |

4. Click **"Deploy site"**
5. Wait 2–3 minutes → Your site will be live!

### Set Environment Variable in Netlify

In **Site Settings → Environment Variables**, add:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://car-service-backend.onrender.com` |

Then trigger a redeploy: **Deploys → Trigger deploy → Deploy site**

---

## STEP 5 — Fix CORS (Allow Frontend URL)

Once Netlify gives you a URL like `https://amazing-app-123.netlify.app`, you need to update the backend's CORS settings.

Open `backend/main.py`, find the CORS section and make sure your Netlify URL is included:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3002",
        "https://amazing-app-123.netlify.app",  # ← add your Netlify URL
        "*",  # or use "*" for any origin (less secure)
    ],
    ...
)
```

Commit, push, Render auto-redeploys.

---

## ✅ Final Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed on Render — `/health` returns healthy
- [ ] Database tables created automatically on first startup
- [ ] Frontend deployed on Netlify — app loads
- [ ] Can login with admin / Avan@123
- [ ] Can create clients, invoices, quotations
- [ ] PDFs generate correctly

---

## ⚠️ Important Notes

### Free Tier Limitations
- **Render free tier**: Backend sleeps after 15 minutes of inactivity. First request after sleep takes 30–60 seconds. Upgrade to Starter ($7/mo) to keep it always on.
- **Netlify free tier**: 100GB bandwidth/month. More than enough.
- **Render PostgreSQL free tier**: 1GB storage, 90-day expiry — upgrade to avoid data loss.

### Render PostgreSQL 90-Day Limit
Free PostgreSQL databases on Render expire after 90 days. To avoid losing data:
1. Upgrade to Render Starter plan ($7/mo) for the database
2. OR export your data regularly via pg_dump

### Admin Login
- Username: `admin`
- Password: `Avan@123`

---

## Troubleshooting

### Backend shows 500 errors after first deploy
The startup migrations run automatically and fix schema issues. Wait 1 minute and try again.

### "CORS error" in browser console
Add your Netlify URL to the CORS allowed origins in `backend/main.py`.

### Frontend shows "Network Error"
Check that `VITE_API_URL` in Netlify environment variables matches your Render backend URL exactly (no trailing slash).

### Database connection fails
Make sure `DATABASE_URL` environment variable is set correctly in Render web service settings.
