import sys
import subprocess


def main():
    try:
        return subprocess.call([sys.executable, "-m", "pytest", "backend/tests"])
    except FileNotFoundError:
        print("pytest not found. Install dependencies first.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
