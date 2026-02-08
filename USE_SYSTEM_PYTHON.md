# ✅ Use System Python Instead of Anaconda

## The Problem:
Anaconda has permission issues. Use system Python 3.9 instead.

## Solution: Use System Python

### Step 1: Install packages with system Python

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
/Library/Developer/CommandLineTools/usr/bin/python3 -m pip install --upgrade motor pymongo fastapi uvicorn python-dotenv PyJWT
```

### Step 2: Start backend with system Python

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
/Library/Developer/CommandLineTools/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Keep this terminal open!**

You should see:
- `INFO:     Uvicorn running on http://0.0.0.0:8001`
- `✅ MongoDB: Connected`

### Step 3: Test

```bash
curl http://localhost:8001/api/health
```

### Step 4: Register

Go to: **http://localhost:3001/register**

---

## Quick Command (All in One)

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
