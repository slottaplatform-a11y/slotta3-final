# 🚀 Start Backend - Final Steps

## Step 1: Kill any process on port 8001

Copy and paste this:

```bash
lsof -ti:8001 | xargs kill -9 2>/dev/null; sleep 1; echo "Port cleared"
```

---

## Step 2: Start the backend

Copy and paste this:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
/opt/anaconda3/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Keep this terminal open!**

**You should see:**
- `INFO:     Uvicorn running on http://0.0.0.0:8001`
- `✅ MongoDB: Connected`

**If you see errors, share them!**

---

## Step 3: Test it

Open a NEW terminal and run:

```bash
curl http://localhost:8001/api/health
```

**Expected:** JSON output

---

## Step 4: Register

1. Go to: **http://localhost:3001/register**
2. Fill in the form
3. Click "Create Account"

**Done!** ✅
