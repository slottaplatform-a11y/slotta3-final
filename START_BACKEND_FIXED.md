# 🚀 Start Backend - Final Steps

## The backend process exists but isn't responding. Let's restart it properly.

### Step 1: Kill the old process

```bash
lsof -ti:8001 | xargs kill -9 2>/dev/null; sleep 1; echo "Old process killed"
```

### Step 2: Start backend in a NEW terminal window

**Open a NEW terminal window** (don't use the one with dependency errors) and run:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Watch for these messages:**
- ✅ `INFO:     Uvicorn running on http://0.0.0.0:8001` = Good!
- ✅ `✅ MongoDB: Connected` = Good!
- ❌ Any error messages = Share them with me

**Keep this terminal window open!**

### Step 3: Test in another terminal

Open **another NEW terminal** and run:

```bash
curl http://localhost:8001/api/health
```

**Expected:** JSON output with service status

**If you see "Connection refused":**
- Backend crashed → Check the backend terminal for error messages
- Share the error message

### Step 4: Try Registration

1. Go to: **http://localhost:3001/register**
2. Fill in the form
3. Click "Create Account"

**If it works:** You're done! ✅

**If it fails:**
- Check browser console (F12 → Console tab)
- Check backend terminal for errors
- Share the error messages

---

## Common Errors & Quick Fixes

### "MongoDB connection failed"
→ Check your password in `.env` is correct
→ Make sure MongoDB Atlas allows your IP

### "Module not found"
→ The dependency conflicts might be causing issues
→ Try: `pip3 install uvicorn fastapi motor pymongo python-dotenv PyJWT --upgrade`

### Backend starts then crashes
→ Check the terminal output for the exact error
→ Share the error message

---

## Quick Test Commands

```bash
# Check if backend is running
lsof -i :8001

# Test backend
curl http://localhost:8001/api/health

# Check MongoDB connection (if backend is running)
curl http://localhost:8001/api/health | grep -i mongo
```
