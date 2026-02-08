# 🔧 Fix Current Issues

## Issue 1: Homebrew Not Installed

You're getting `command not found: brew`. Let's install it:

### Install Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**This will:**
- Take 5-10 minutes
- Ask for your password
- Install Homebrew

**After installation**, you may need to add it to your PATH. The installer will show you commands like:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

**Verify it worked:**
```bash
brew --version
```
Should show a version number.

---

## Issue 2: uvicorn Not Installed

You're getting `No module named uvicorn`. Let's install Python dependencies:

### Install Python Dependencies:

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
pip3 install -r requirements.txt
```

**This will install:**
- uvicorn (web server)
- fastapi (API framework)
- motor (MongoDB driver)
- All other required packages

**This may take a few minutes.**

**Verify it worked:**
```bash
python3 -m uvicorn --version
```
Should show a version number.

---

## After Fixing Both Issues:

### Step 1: Install MongoDB

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Step 2: Start Backend

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Step 3: Register & Login

1. Go to: http://localhost:3000/register
2. Create account
3. Go to: http://localhost:3000/login
4. Login with your credentials

---

## Quick Fix Commands (Run These):

```bash
# 1. Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Add Homebrew to PATH (if needed)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# 3. Install Python dependencies
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
pip3 install -r requirements.txt

# 4. Install MongoDB
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# 5. Start backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
