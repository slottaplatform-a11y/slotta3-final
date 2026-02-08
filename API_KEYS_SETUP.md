# 🔑 API KEYS SETUP GUIDE

## ✅ What's Built

Your Slotta backend is **fully functional** and running! All integration structures are in place. The services work in "mock mode" until you add API keys.

**Current Status:**
- ✅ Backend API running on port 8001
- ✅ MongoDB connected
- ✅ All endpoints working
- ✅ Slotta calculation engine ready
- ⚠️ Integrations in mock mode (waiting for API keys)

---

## ✅ Environment Structure (New)

Use the template file at:
```
.env.example
```

Copy backend variables into:
```
backend/.env
```

Copy frontend variables into one of:
```
frontend/.env.development
frontend/.env.staging
frontend/.env.production
```

**Required backend basics:**
```
APP_ENV=development
LOG_LEVEL=INFO
LOG_FILE=
MONGO_URL=...
DB_NAME=...
JWT_SECRET=...
FRONTEND_URL=...
CORS_ORIGINS=...
ADMIN_API_KEY=...
ADMIN_ALLOW_TELEGRAM_WEBHOOK=false
```

**Frontend API base URL (Vite):**
```
VITE_API_BASE_URL_DEV=http://localhost:8001
VITE_API_BASE_URL_STAGING=https://api-staging.example.com
VITE_API_BASE_URL_PROD=https://api.example.com
```

**Stripe publishable key (frontend):**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**Sentry (optional but recommended):**
```
SENTRY_DSN=
VITE_SENTRY_DSN=
```

**Run modes:**
```
npm run dev           # development
npm run dev:staging   # staging
npm run build         # production build
npm run build:staging # staging build
```

---

## 📋 Priority Order (Easy → Advanced)

### 1️⃣ **SENDGRID (Email) - EASIEST** ⭐ Start Here!

**Why first:** Free tier, easiest setup, instant activation

**Steps:**
1. Go to https://sendgrid.com
2. Click "Start for Free"
3. Sign up (free 100 emails/day forever)
4. Verify your email
5. Go to **Settings > API Keys**
6. Click **Create API Key**
7. Name it "Slotta"
8. Select **"Restricted Access"**
9. Enable **"Mail Send"** permission only
10. Click **Create & View**
11. **COPY THE KEY** (you won't see it again!)
12. Add to `backend/.env`:
    ```
    SENDGRID_API_KEY=SG.xxx...your_key_here
    FROM_EMAIL=noreply@slotta.com
    ```
13. Verify sender email:
    - Go to **Settings > Sender Authentication**
    - Click **Verify a Single Sender**
    - Use your email (e.g., your@email.com)
    - Check email and click verify link

14. Restart backend:
    ```bash
    sudo supervisorctl restart backend
    ```

**Testing:**
```bash
# Check if enabled
curl http://localhost:8001/api/health
# Should show "email": true
```

---

### 2️⃣ **TELEGRAM BOT - VERY EASY** 🤖

**Why second:** Free, takes 2 minutes, instant setup

**Steps:**
1. Open **Telegram** app
2. Search for **@BotFather**
3. Send `/newbot`
4. Follow prompts:
   - Bot name: "Slotta Notifications"
   - Username: "your_slotta_bot" (must end in 'bot')
5. **Copy the API token** (looks like: `1234567890:ABCdef...`)
6. Add to `backend/.env`:
    ```
    TELEGRAM_BOT_TOKEN=1234567890:ABCdef...your_token
    ```
7. Start your bot:
   - Click the link BotFather gives you
   - Send `/start` to your bot
8. Get your chat_id (needed for notifications):
   - Go to: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   - Find `"chat":{"id":123456789}`
   - Save this chat_id for master profiles

9. Restart backend

**Testing:**
Your bot will now send notifications when bookings are created!

---

### 3️⃣ **STRIPE (Payments) - MODERATE** 💳

**Why third:** Core feature, but requires more setup

**Steps:**

#### A. Get Test Keys (Use these first!)
1. Go to https://stripe.com
2. Sign up for free account
3. Skip verification (you can use test mode without verification)
4. Go to **Developers > API Keys**
5. Toggle to **"Test mode"** (top right)
6. Copy **Secret key** (starts with `sk_test_...`)
7. Copy **Publishable key** (starts with `pk_test_...`)
8. Add to `backend/.env`:
    ```
    STRIPE_SECRET_KEY=sk_test_...your_key
    STRIPE_PUBLISHABLE_KEY=pk_test_...your_key
    STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_secret
    STRIPE_PRICE_ID_MONTHLY=price_...your_monthly_price_id
    ```

#### B. Enable Stripe Connect (Required for Slotta)
1. In Stripe Dashboard, go to **Connect**
2. Click **Get Started**
3. Choose **"Standard"** account type
4. Fill in basic info (use test mode, no real details needed)
5. Enable **"Platform payments"**

#### C. Test with Stripe Test Cards
When testing payments, use:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Testing:**
```bash
# Create a test payment intent
curl -X POST http://localhost:8001/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "master_id": "...",
    "client_id": "...",
    "service_id": "...",
    "booking_date": "2025-02-20T10:00:00Z"
  }'
```

---

### 4️⃣ **GOOGLE CALENDAR - ADVANCED** 📅

**Why last:** Most complex OAuth setup, not critical for MVP

**Steps:**

#### A. Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Click **"Select a project"** > **"New Project"**
3. Name it "Slotta"
4. Click **Create**

#### B. Enable Google Calendar API
1. In your project, go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click it and press **"Enable"**

#### C. Create OAuth Credentials
1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. If prompted, configure **OAuth consent screen** first:
   - User Type: **External**
   - App name: "Slotta"
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through all steps
4. Back to **Create OAuth client ID**:
   - Application type: **Web application**
   - Name: "Slotta Web"
   - Authorized redirect URIs:
     ```
     http://localhost:8001/api/google/oauth/callback
     ```
   - Click **Create**
5. **Copy Client ID and Client Secret**
6. Add to `backend/.env`:
    ```
    GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your_client_secret
    GOOGLE_REDIRECT_URI=http://localhost:8001/api/google/oauth/callback
    ```

**Note:** Full OAuth flow needs frontend implementation. This is Phase 2!

---

## 🚀 Quick Start (Minimal Setup)

**Want to test NOW?** Just add SendGrid:

1. Get SendGrid API key (5 minutes)
2. Add to `.env`
3. Restart backend
4. Emails will work!

Everything else works in mock mode - you'll see logs like:
```
[MOCK] Would send Telegram message...
[MOCK] Would create payment intent for €40...
```

---

## 📊 Check Integration Status

Run this command anytime:
```bash
curl http://localhost:8001/api/health
```

Response shows which services are enabled:
```json
{
  "status": "healthy",
  "services": {
    "email": false,      ← Add SENDGRID_API_KEY
    "telegram": false,   ← Add TELEGRAM_BOT_TOKEN
    "stripe": false,     ← Add STRIPE_SECRET_KEY
    "google_calendar": false  ← Add GOOGLE_CLIENT_ID
  }
}
```

---

## 🔧 Adding Keys to .env

**Location:** `backend/.env`

**Current content:** (database settings only)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=slotta_db
CORS_ORIGINS=*
```

**After adding keys:**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=slotta_db
CORS_ORIGINS=*

# SendGrid
SENDGRID_API_KEY=SG.abc123...
FROM_EMAIL=noreply@slotta.com

# Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...

# Stripe  
STRIPE_SECRET_KEY=sk_test_abc123...
STRIPE_PUBLISHABLE_KEY=pk_test_xyz789...

# Google Calendar
GOOGLE_CLIENT_ID=123-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**After editing `.env`:**
```bash
sudo supervisorctl restart backend
```

---

## 🎯 Recommended Approach

### Day 1: Email Only
- ✅ Add SendGrid (5 min)
- ✅ Test booking confirmations
- ✅ Master sees email notifications

### Day 2: Add Telegram
- ✅ Create bot (2 min)
- ✅ Instant mobile notifications
- ✅ Test both email + Telegram

### Day 3: Add Stripe
- ✅ Create account
- ✅ Get test keys
- ✅ Enable Connect
- ✅ Test payment holds

### Day 4: Polish & Test
- ✅ Full booking flow
- ✅ No-show handling
- ✅ Payout testing

### Later: Google Calendar
- When you need calendar sync
- Requires OAuth flow in frontend
- Not critical for MVP

---

## ❓ FAQ

**Q: Can I launch without Stripe?**
A: Backend works, but bookings won't have real payment holds. Good for testing UI/UX.

**Q: Do I need all integrations?**
A: Only Stripe is critical for production. Email is highly recommended. Others are nice-to-have.

**Q: Are these free tiers enough?**
A: Yes! 
- SendGrid: 100 emails/day (plenty for early users)
- Telegram: Unlimited (free forever)
- Stripe: No monthly fee, just transaction fees

**Q: What about production keys?**
A: Start with test keys. When ready to launch:
1. Stripe: Complete verification
2. SendGrid: Stay on free tier or upgrade
3. Same tokens work for Telegram/Google

**Q: How do I test without real API keys?**
A: Everything works in mock mode! You'll see console logs. Perfect for frontend development.

---

## 🆘 Need Help?

**Stuck on setup?** Common issues:

1. **SendGrid emails not sending:**
   - Check sender email is verified
   - Check API key has "Mail Send" permission
   - Check spam folder

2. **Telegram bot not responding:**
   - Make sure you sent `/start` to your bot first
   - Check token is correct (no spaces)

3. **Stripe errors:**
   - Make sure you're in test mode
   - Use test card numbers
   - Check secret key starts with `sk_test_`

4. **Backend not restarting:**
   ```bash
   # Check logs
   tail -f /var/log/supervisor/backend.err.log
   
   # Manual restart
   sudo supervisorctl restart backend
   ```

---

## ✅ Next Steps

Once you have at least SendGrid working:

1. ✅ Test booking creation
2. ✅ Check email notifications
3. ✅ Connect frontend to backend APIs
4. ✅ Add more integrations as needed
5. ✅ Deploy to production!

**Your backend is ready! Just add the keys you want to use.** 🚀
