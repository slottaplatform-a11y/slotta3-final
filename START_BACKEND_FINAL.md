# 🚀 Start Backend - Final Solution

## The "Address already in use" Error

This means something is already running on port 8001. Here's how to fix it:

### Step 1: Kill whatever is on port 8001

```bash
lsof -ti:8001 | xargs kill -9 2>/dev/null; echo "Port cleared"
```

### Step 2: Verify port is free

```bash
lsof -i:8001
```

Should show nothing (or "Port 8001 is now free")

### Step 3: Start backend

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
/Library/Developer/CommandLineTools/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Keep this terminal open!**

You should see:
- `INFO:     Uvicorn running on http://0.0.0.0:8001`
- `✅ MongoDB: Connected`

### Step 4: Test

```bash
curl http://localhost:8001/api/health
```

---

## If You Keep Getting "Address already in use"

Run this to find and kill ALL Python processes on port 8001:

```bash
# Find the process
lsof -i:8001

# Kill it (replace PID with the number from above)
kill -9 <PID>

# Or kill all Python processes (be careful!)
pkill -f "uvicorn.*8001"
```

---

## Quick One-Liner to Restart Backend

```bash
lsof -ti:8001 | xargs kill -9 2>/dev/null; sleep 1; cd /Users/sparkcaitlin/Downloads/slotta3-main/backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

This kills the old process and starts a new one.
