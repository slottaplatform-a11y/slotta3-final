# ✅ Get Started - Follow These Steps

## Step 1: Start MongoDB

Open your **Terminal** app and run:

```bash
brew services start mongodb-community
```

**Wait for:** It should say "Successfully started" or similar.

**Verify it's running:**
```bash
brew services list | grep mongodb
```
You should see `mongodb-community` with status "started"

---

## Step 2: Start the Backend Server

**Keep Terminal open**, and run these commands:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
pip3 install -r requirements.txt
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**What to look for:**
- You should see: `INFO:     Uvicorn running on http://0.0.0.0:8001`
- You should see: `✅ MongoDB: Connected`
- **Keep this terminal window open!** Don't close it.

---

## Step 3: Test the Backend

Open a **NEW Terminal window** and run:

```bash
curl http://localhost:8001/api/health
```

**Expected:** You should see JSON output with service information.

**If you see "Connection refused":**
- Go back to Step 2 - make sure backend is running
- Check the backend terminal for error messages

---

## Step 4: Register Your Account

1. Open your browser
2. Go to: **http://localhost:3000/register**
3. Fill in:
   - **Name:** Your name (e.g., "John Doe")
   - **Email:** your@email.com
   - **Password:** something secure (at least 6 characters)
   - **Booking slug:** Will auto-fill from your name
4. Click **"Create Account"**

**Expected:** You should be redirected to the dashboard automatically.

**If you see "Registration failed":**
- Check the backend terminal (Step 2) for error messages
- Make sure backend is still running
- Check browser console (F12) for errors

---

## Step 5: Login

1. Go to: **http://localhost:3000/login**
2. Enter the **exact same email and password** you just registered
3. Click **"Sign In"**

**Expected:** You should be logged in and see the dashboard!

---

## Troubleshooting

### "brew: command not found"
→ You need to install Homebrew first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### "MongoDB service not found"
→ Install MongoDB first:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### "pip3: command not found" or "python3: command not found"
→ You need Python 3 installed. On macOS, it's usually already there. Try:
```bash
python3 --version
```

### Backend shows "MONGO_URL" error
→ Check that `backend/.env` file exists and has:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=slotta_db
```

### Backend shows "Connection refused" for MongoDB
→ MongoDB is not running. Go back to Step 1.

---

## Quick Status Check

Run this to see what's running:

```bash
# Check MongoDB
brew services list | grep mongodb

# Check Backend
curl http://localhost:8001/api/health

# Check Frontend (should be running already)
curl http://localhost:3000
```

---

## What You Should Have Running:

✅ **Terminal 1:** MongoDB service (`brew services start mongodb-community`)
✅ **Terminal 2:** Backend server (`python3 -m uvicorn server:app ...`)
✅ **Frontend:** Already running on port 3000 (from `npm run dev`)

**All 3 must be running!**
