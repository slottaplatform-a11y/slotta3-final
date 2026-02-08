# 🔍 Debug Login Issues

## Current Status Check

Run these commands to check what's running:

### 1. Check if Backend is Running
```bash
lsof -i :8001
```
If nothing shows, backend is NOT running.

### 2. Check if MongoDB is Running
```bash
lsof -i :27017
# OR
brew services list | grep mongodb
```
If nothing shows, MongoDB is NOT running.

---

## Common Issues & Fixes

### Issue 1: Backend Not Running

**Symptoms:**
- Login page shows "Registration failed" or "Invalid email or password"
- Browser console shows network errors
- `curl http://localhost:8001/api/health` fails

**Fix:**
```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Check for errors:**
- If you see "MONGO_URL" error → MongoDB not set up
- If you see "Connection refused" → MongoDB not running
- If you see "ModuleNotFoundError" → Run `pip3 install -r requirements.txt`

---

### Issue 2: MongoDB Not Running

**Symptoms:**
- Backend starts but crashes immediately
- Error: "Connection refused" or "MongoDB connection failed"

**Fix:**

**Option A: If MongoDB is installed via Homebrew**
```bash
brew services start mongodb-community
```

**Option B: If MongoDB is not installed**
Follow `INSTALL_MONGODB.md` to install it first.

**Option C: Use MongoDB Atlas (Cloud)**
1. Go to https://cloud.mongodb.com
2. Get connection string
3. Update `backend/.env`:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/slotta_db
   ```

---

### Issue 3: No Account Exists

**Symptoms:**
- Backend is running
- MongoDB is running
- Login fails with "Invalid email or password"

**Fix:**
You need to **register first** before you can login!

1. Go to: http://localhost:3000/register
2. Create an account
3. Then try logging in

**OR** if you want the demo account:
- Email: `sophia@slotta.app`
- Password: `demo123`
- But this account needs to be seeded first (requires admin setup)

---

### Issue 4: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Backend running but frontend can't connect

**Fix:**
Check `backend/.env` has:
```
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

---

## Step-by-Step Debugging

### Step 1: Verify Backend is Running
```bash
curl http://localhost:8001/api/health
```

**Expected:** JSON response with service status
**If fails:** Backend not running → Start it

### Step 2: Verify MongoDB Connection
Check backend terminal for:
- ✅ "MongoDB: Connected" → Good!
- ❌ "Connection refused" → MongoDB not running
- ❌ "MONGO_URL" error → .env file missing/invalid

### Step 3: Test Registration
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@test.com",
    "password": "test123",
    "booking_slug": "testuser"
  }'
```

**Expected:** JSON with token and master data
**If fails:** Check error message

### Step 4: Test Login
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123"
  }'
```

**Expected:** JSON with token and master data
**If fails:** Account doesn't exist → Register first

---

## Quick Checklist

- [ ] MongoDB is installed and running
- [ ] `backend/.env` file exists with MONGO_URL
- [ ] Backend server is running on port 8001
- [ ] Frontend is running on port 3000
- [ ] You've registered an account (or demo account exists)
- [ ] Browser console shows no errors

---

## Still Not Working?

1. **Check browser console** (F12 → Console tab)
   - Look for red error messages
   - Share the exact error

2. **Check backend terminal**
   - Look for error messages
   - Share the exact error

3. **Test backend directly:**
   ```bash
   curl http://localhost:8001/api/health
   ```

4. **Check .env file:**
   ```bash
   cd backend
   cat .env | grep MONGO_URL
   ```
