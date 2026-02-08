# 🗄️ MongoDB Setup Guide for Slotta

## Option 1: MongoDB Atlas (Free Cloud) - ⭐ RECOMMENDED

**Why:** No installation needed, free forever, works immediately

### Steps:

1. **Sign up for MongoDB Atlas** (Free tier)
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up with email (free account)

2. **Create a Free Cluster**
   - Click "Build a Database"
   - Choose "FREE" (M0) tier
   - Select a cloud provider and region (closest to you)
   - Click "Create"

3. **Create Database User**
   - Username: `slotta_admin` (or your choice)
   - Password: Create a strong password (save it!)
   - Click "Create Database User"

4. **Set Network Access**
   - Click "Network Access" in left menu
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Or add your specific IP for production

5. **Get Connection String**
   - Click "Database" in left menu
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster.mongodb.net`
   - Replace `<password>` with your actual password
   - Replace `<dbname>` with `slotta_db` (or remove it)

6. **Add to .env file**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `backend/.env` and set:
   ```
   MONGO_URL=mongodb+srv://slotta_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/slotta_db?retryWrites=true&w=majority
   DB_NAME=slotta_db
   ```

---

## Option 2: Install MongoDB Locally (macOS)

### Using Homebrew:

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

Then in `backend/.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=slotta_db
```

---

## Option 3: Install MongoDB Locally (Windows)

1. Download MongoDB Community Server:
   - https://www.mongodb.com/try/download/community
   - Choose Windows version
   - Run installer (choose "Complete" installation)

2. MongoDB will start automatically as a service

3. In `backend/.env`:
   ```
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=slotta_db
   ```

---

## After Setup:

1. Create `backend/.env` file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` and fill in:
   - `MONGO_URL` (from Atlas or local)
   - `DB_NAME=slotta_db`
   - `JWT_SECRET` (any random string, at least 32 characters)

3. Start the backend:
   ```bash
   cd backend
   python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

4. Test connection:
   ```bash
   curl http://localhost:8001/api/health
   ```

---

## Quick Test:

Once MongoDB is connected, you should see in the backend logs:
```
✅ MongoDB: Connected
✅ Database: slotta_db
```
