# ✅ EXACT COMMANDS - Copy & Paste

## The backend isn't running. Run these commands in order:

### 1. Make sure you're in the backend directory

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
```

### 2. Kill anything on port 8001

```bash
lsof -ti:8001 | xargs kill -9 2>/dev/null; echo "Port cleared"
```

### 3. Start the backend (KEEP THIS TERMINAL OPEN!)

```bash
/opt/anaconda3/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**IMPORTANT:** 
- Keep this terminal window open
- Watch for these messages:
  - ✅ `INFO:     Uvicorn running on http://0.0.0.0:8001`
  - ✅ `✅ MongoDB: Connected`
- If you see errors, STOP and share them

### 4. Test in a NEW terminal

Open a **NEW terminal window** and run:

```bash
curl http://localhost:8001/api/health
```

**If you see JSON output** = Backend is working! ✅

**If you see "Connection refused"** = Backend didn't start → Check the terminal from Step 3 for errors

### 5. Register your account

1. Go to: **http://localhost:3001/register**
2. Fill in the form
3. Click "Create Account"

---

## If backend won't start:

**Check the error message in the terminal.** Common issues:

- **"MONGO_URL" error** → Check `.env` file has correct password
- **"Module not found"** → Run: `/opt/anaconda3/bin/pip install uvicorn fastapi motor pymongo python-dotenv PyJWT`
- **"Address already in use"** → Run Step 2 again to kill the process
- **"MongoDB connection failed"** → Check your password in `.env` is correct

---

## Quick Status Check

```bash
# Check if backend is running
lsof -i :8001

# Test backend
curl http://localhost:8001/api/health
```
