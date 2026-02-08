# 📝 How to Open backend/.env File

## Option 1: Open in VS Code (if installed)

```bash
code /Users/sparkcaitlin/Downloads/slotta3-main/backend/.env
```

Or from the backend directory:
```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
code .env
```

---

## Option 2: Open in Default Text Editor (macOS)

```bash
open /Users/sparkcaitlin/Downloads/slotta3-main/backend/.env
```

Or from the backend directory:
```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
open .env
```

---

## Option 3: Open in nano (Terminal Text Editor)

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
nano .env
```

**To save in nano:**
- Press `Ctrl + O` (save)
- Press `Enter` (confirm)
- Press `Ctrl + X` (exit)

---

## Option 4: Open in vim (Terminal Text Editor)

```bash
cd /Users/sparkcaitlin/Downloads/slotta3-main/backend
vim .env
```

**To edit in vim:**
- Press `i` (insert mode)
- Make your changes
- Press `Esc` (exit insert mode)
- Type `:wq` and press `Enter` (save and quit)

---

## Quick Command (Recommended)

**If you have VS Code:**
```bash
code /Users/sparkcaitlin/Downloads/slotta3-main/backend/.env
```

**If you don't have VS Code:**
```bash
open /Users/sparkcaitlin/Downloads/slotta3-main/backend/.env
```

---

## What to Change

Once the file is open, find this line:
```
MONGO_URL=mongodb+srv://slottaplatform_db_user:<MY_ATLAS_PASSWORD>@cluster0.ibpkwda.mongodb.net/slotta_db?retryWrites=true&w=majority&appName=Cluster0
```

Replace `<MY_ATLAS_PASSWORD>` with your actual MongoDB Atlas password.

Save the file, then restart the backend!
