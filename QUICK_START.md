# 🚀 Slotta Quick Start Guide

## Current Issue
**The backend server is not running**, which is why login/registration fails.

## Step-by-Step Fix

### Step 1: Set Up MongoDB (Choose One)

#### Option A: MongoDB Atlas (Easiest - 5 minutes)
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free account)
3. Create a FREE cluster
4. Create database user (save username/password!)
5. Allow network access from anywhere (for development)
6. Get connection string from "Connect" → "Connect your application"
7. Copy the connection string

#### Option B: Install MongoDB Locally (macOS)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

---

### Step 2: Create Backend .env File

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
```

Create a file named `.env` with this content:

```env
APP_ENV=development
LOG_LEVEL=INFO

# MongoDB Connection
# For Atlas: mongodb+srv://username:password@cluster.mongodb.net/slotta_db
# For Local: mongodb://localhost:27017
MONGO_URL=mongodb://localhost:27017
DB_NAME=slotta_db

# JWT Secret (change this to any random string)
JWT_SECRET=slotta-secret-key-change-this-in-production-min-32-chars

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# Admin (optional)
ADMIN_API_KEY=admin-key-change-this
ADMIN_ALLOW_TELEGRAM_WEBHOOK=false
```

**Important:** Replace `MONGO_URL` with your actual MongoDB connection string!

---

### Step 3: Install Python Dependencies

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
pip3 install -r requirements.txt
```

---

### Step 4: Start the Backend Server

Open a **new terminal window** and run:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
✅ MongoDB: Connected
```

**Keep this terminal open!** The backend needs to keep running.

---

### Step 5: Test the Backend

In another terminal, test if it's working:

```bash
curl http://localhost:8001/api/health
```

You should get a JSON response with service status.

---

### Step 6: Create Your Account

Now go to: http://localhost:3000/register

Fill in:
- Name: Your name
- Email: your@email.com
- Password: (at least 6 characters)
- Booking slug: (auto-generated from name)

Click "Create Account" - it should work now!

---

### Step 7: Demo Account (Optional)

If you want the demo account (`sophia@slotta.app` / `demo123`), you need to seed it:

1. Make sure backend is running
2. The seed endpoint requires admin key, so you'd need to:
   - Set `ADMIN_API_KEY` in `.env`
   - Call the seed endpoint with that key

**Or just create your own account** - it's easier!

---

## Troubleshooting

### "Backend not running"
- Make sure Step 4 is done (backend server running)
- Check terminal for errors
- Verify MongoDB connection string is correct

### "MongoDB connection failed"
- Check your `MONGO_URL` in `.env`
- For Atlas: Make sure network access allows your IP
- For local: Make sure MongoDB service is running (`brew services list`)

### "Registration failed"
- Check browser console (F12) for error details
- Make sure backend is running on port 8001
- Check backend terminal for error messages

---

## Need Help?

Check the detailed guides:
- `MONGODB_SETUP.md` - MongoDB setup details
- `API_KEYS_SETUP.md` - Optional integrations (Stripe, SendGrid, etc.)
