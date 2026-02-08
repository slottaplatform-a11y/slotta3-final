# 🚀 Start Backend - Quick Fix

## The Problem:
- ✅ Frontend is running on port 3001
- ❌ Backend is NOT running on port 8001
- ❌ MongoDB is probably not running

**That's why registration/login doesn't work!**

---

## Solution: Start MongoDB + Backend

### Step 1: Check if MongoDB is Running

Open Terminal and run:

```bash
brew services list | grep mongodb
```

**If you see `mongodb-community` with status "started"** → MongoDB is running ✅
**If you see nothing or "stopped"** → Continue to Step 2

---

### Step 2: Start MongoDB

```bash
brew services start mongodb-community
```

**If you get "command not found: brew":**
- You need to install Homebrew first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**If you get "service not found":**
- Install MongoDB first:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

---

### Step 3: Start the Backend Server

**Open a NEW Terminal window** (keep MongoDB terminal open) and run:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
✅ MongoDB: Connected
```

**Keep this terminal open!** The backend must keep running.

---

### Step 4: Test the Backend

**Open another Terminal** and test:

```bash
curl http://localhost:8001/api/health
```

**Expected:** JSON response with service status

**If you see "Connection refused":**
- Backend is not running → Go back to Step 3
- Check the backend terminal for error messages

---

### Step 5: Now Try Registration/Login!

1. Go to: **http://localhost:3001/register**
2. Fill in the form and click "Create Account"
3. You should be redirected to the dashboard!

If registration works, then login will work too!

---

## Common Errors & Fixes

### Error: "MONGO_URL" or "Connection refused"
→ MongoDB is not running
→ Run: `brew services start mongodb-community`

### Error: "No module named uvicorn"
→ Python packages not installed
→ Run: `cd backend && pip3 install -r requirements.txt`

### Error: "Backend not accessible"
→ Backend is not running
→ Start it with: `python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload`

### Error: "Registration failed" in browser
→ Check browser console (F12) for errors
→ Check backend terminal for error messages
→ Make sure backend is running on port 8001

---

## Quick Status Check

Run these to see what's running:

```bash
# Check MongoDB
brew services list | grep mongodb

# Check Backend
curl http://localhost:8001/api/health

# Check what's on port 8001
lsof -i :8001
```

---

## What You Need Running:

✅ **Terminal 1:** MongoDB (`brew services start mongodb-community`)
✅ **Terminal 2:** Backend (`python3 -m uvicorn server:app ...`)
✅ **Frontend:** Already running on port 3001 ✅

**All 3 must be running for registration/login to work!**
