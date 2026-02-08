# 🚀 How to Start Slotta (Step-by-Step)

## ⚠️ IMPORTANT: You MUST start these services before login will work!

---

## Step 1: Start MongoDB

**Open Terminal #1** and run:

```bash
# Check if MongoDB is installed
brew services list | grep mongodb

# If you see mongodb-community listed:
brew services start mongodb-community

# If MongoDB is NOT installed:
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Verify it's running:**
```bash
brew services list | grep mongodb
```
Should show: `mongodb-community  started`

---

## Step 2: Start Backend Server

**Open Terminal #2** (keep Terminal #1 open!) and run:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend

# Install dependencies (only needed once)
pip3 install -r requirements.txt

# Start the backend
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

## Step 3: Verify Backend is Working

**Open Terminal #3** and test:

```bash
curl http://localhost:8001/api/health
```

**Expected:** You should see JSON response with service status.

**If you see "Connection refused":**
- Backend is not running → Go back to Step 2
- Check Terminal #2 for error messages

---

## Step 4: Register Your Account FIRST!

**⚠️ You CANNOT login without an account!**

1. Go to: **http://localhost:3000/register**
2. Fill in the form:
   - Name: Your name
   - Email: your@email.com
   - Password: (at least 6 characters)
   - Booking slug: (auto-generated from name)
3. Click "Create Account"
4. You should be redirected to the dashboard

---

## Step 5: Now You Can Login!

1. Go to: **http://localhost:3000/login**
2. Enter the email and password you just registered
3. Click "Sign In"
4. You should be logged in!

---

## Common Problems

### Problem: "Backend not running"
**Solution:** Make sure Terminal #2 is running the backend server

### Problem: "MongoDB connection failed"
**Solution:** 
- Check Terminal #1 - is MongoDB started?
- Run: `brew services list | grep mongodb`
- If not started: `brew services start mongodb-community`

### Problem: "Registration failed"
**Solution:**
- Check Terminal #2 (backend) for error messages
- Make sure backend is running
- Check browser console (F12) for errors

### Problem: "Invalid email or password"
**Solution:**
- Make sure you REGISTERED first (Step 4)
- Use the exact email/password you registered with
- Check for typos

---

## Quick Checklist

Before trying to login, make sure:

- [ ] MongoDB is running (Terminal #1)
- [ ] Backend is running (Terminal #2) 
- [ ] Backend shows "✅ MongoDB: Connected"
- [ ] `curl http://localhost:8001/api/health` works
- [ ] You've registered an account at `/register`
- [ ] Frontend is running on port 3000

---

## What You Need Running:

1. **Terminal #1:** MongoDB service (`brew services start mongodb-community`)
2. **Terminal #2:** Backend server (`python3 -m uvicorn server:app ...`)
3. **Terminal #3 (or npm):** Frontend (`npm run dev`)

**All 3 must be running for the app to work!**
