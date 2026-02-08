# 🚀 FINAL SETUP - Copy & Paste These Commands

## Step 1: Open the .env file in TextEdit

Copy and paste this into your terminal:

```bash
open /Users/sparkcaitlin/Downloads/slotta3-main/backend/.env
```

This will open the file in TextEdit (or your default text editor).

---

## Step 2: Replace the Password

In the file that opened, find this line:
```
MONGO_URL=mongodb+srv://slottaplatform_db_user:<MY_ATLAS_PASSWORD>@cluster0.ibpkwda.mongodb.net/slotta_db?retryWrites=true&w=majority&appName=Cluster0
```

**Delete `<MY_ATLAS_PASSWORD>` and type your actual MongoDB Atlas password.**

Example: If your password is `mypass123`, the line should become:
```
MONGO_URL=mongodb+srv://slottaplatform_db_user:mypass123@cluster0.ibpkwda.mongodb.net/slotta_db?retryWrites=true&w=majority&appName=Cluster0
```

**Save the file** (Cmd+S or File → Save).

---

## Step 3: Stop Old Backend (if running)

Copy and paste this:

```bash
lsof -ti:8001 | xargs kill -9 2>/dev/null; echo "Backend stopped (or wasn't running)"
```

---

## Step 4: Start the Backend

Copy and paste this:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend && python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Keep this terminal window open!** You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
✅ MongoDB: Connected
```

---

## Step 5: Test It

Open a NEW terminal window and paste:

```bash
curl http://localhost:8001/api/health
```

You should see JSON output. If you see "Connection refused", go back to Step 4.

---

## Step 6: Register Your Account

1. Go to: **http://localhost:3001/register**
2. Fill in:
   - Name: Your name
   - Email: your@email.com
   - Password: (at least 6 characters)
3. Click "Create Account"

**Done!** You should be logged in and see the dashboard.

---

## If Something Fails

**Backend won't start?**
- Check the terminal for error messages
- Make sure you saved the .env file with the correct password

**"MongoDB connection failed"?**
- Check your password in .env is correct
- Make sure MongoDB Atlas allows your IP address

**"Registration failed"?**
- Check browser console (F12 → Console tab)
- Check backend terminal for errors
