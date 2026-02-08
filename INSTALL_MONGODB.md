# 🍺 Install MongoDB Locally on macOS

## Step 1: Install Homebrew (if not installed)

Run this command in your terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

This will take a few minutes. Follow the prompts and enter your password when asked.

**After installation**, you may need to add Homebrew to your PATH. The installer will tell you if you need to run additional commands like:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

---

## Step 2: Install MongoDB

Once Homebrew is installed, run these commands:

```bash
# Add MongoDB tap
brew tap mongodb/brew

# Install MongoDB Community Edition
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

---

## Step 3: Verify MongoDB is Running

```bash
# Check if MongoDB service is running
brew services list | grep mongodb

# Or test the connection
mongosh --eval "db.version()"
```

You should see MongoDB version information if it's working.

---

## Step 4: Update .env File

Your `.env` file should already have the correct settings:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=slotta_db
```

This is already set correctly! ✅

---

## Step 5: Install Python Dependencies

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
pip3 install -r requirements.txt
```

---

## Step 6: Start the Backend Server

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
✅ MongoDB: Connected
```

---

## Step 7: Test It!

In another terminal:

```bash
curl http://localhost:8001/api/health
```

You should get a JSON response.

---

## Troubleshooting

### "brew: command not found"
- Make sure Homebrew installation completed
- Try restarting your terminal
- Check if you need to add Homebrew to PATH (the installer will tell you)

### "MongoDB service won't start"
```bash
# Check logs
brew services list
tail -f /opt/homebrew/var/log/mongodb/mongo.log

# Try restarting
brew services restart mongodb-community
```

### "Port 27017 already in use"
- Another MongoDB instance might be running
- Check: `lsof -i :27017`
- Stop other instances or change MongoDB port

---

## Quick Commands Reference

```bash
# Start MongoDB
brew services start mongodb-community

# Stop MongoDB
brew services stop mongodb-community

# Restart MongoDB
brew services restart mongodb-community

# Check MongoDB status
brew services list | grep mongodb

# Connect to MongoDB shell
mongosh
```
