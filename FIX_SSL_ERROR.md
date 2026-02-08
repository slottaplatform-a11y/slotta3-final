# 🔧 Fix SSL Error - Quick Solution

## The Problem:
You're getting: `AttributeError: module 'lib' has no attribute 'X509_get_default_cert_dir_env'`

This is a version conflict between `pyOpenSSL` and `cryptography`.

## Solution: Use Anaconda Python

Since you're using Anaconda Python 3.12, use Anaconda's pip:

### Step 1: Install/Upgrade packages with Anaconda pip

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
/opt/anaconda3/bin/pip install --upgrade pyopenssl cryptography pymongo motor fastapi uvicorn python-dotenv PyJWT
```

### Step 2: Start backend with Anaconda Python

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
/opt/anaconda3/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**OR** if you're in the Anaconda base environment:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Step 3: Test

```bash
curl http://localhost:8001/api/health
```

---

## Alternative: Use System Python 3.9

If Anaconda keeps causing issues, use system Python:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
/Library/Developer/CommandLineTools/usr/bin/python3 -m pip install --upgrade pyopenssl cryptography pymongo motor fastapi uvicorn python-dotenv PyJWT
/Library/Developer/CommandLineTools/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
