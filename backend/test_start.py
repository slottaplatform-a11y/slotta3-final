#!/usr/bin/env python3
"""Quick test to see if server can import and start"""

import sys
from pathlib import Path

print("Testing server startup...")
print(f"Python: {sys.executable}")
print(f"Python version: {sys.version}")

try:
    print("\n1. Testing imports...")
    from dotenv import load_dotenv
    print("   ✅ dotenv")
    
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    print("   ✅ .env loaded")
    
    import os
    print(f"   ✅ MONGO_URL exists: {bool(os.getenv('MONGO_URL'))}")
    print(f"   ✅ DB_NAME: {os.getenv('DB_NAME', 'NOT SET')}")
    
    print("\n2. Testing server import...")
    from server import app
    print("   ✅ Server imported successfully!")
    
    print("\n3. Testing MongoDB connection...")
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    
    async def test_mongo():
        mongo_url = os.getenv("MONGO_URL")
        if not mongo_url:
            print("   ❌ MONGO_URL not set in .env")
            return False
        
        try:
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
            await client.admin.command('ping')
            print("   ✅ MongoDB connection successful!")
            client.close()
            return True
        except Exception as e:
            print(f"   ❌ MongoDB connection failed: {e}")
            return False
    
    result = asyncio.run(test_mongo())
    
    if result:
        print("\n✅ All checks passed! Server should start.")
        print("\nRun: /Library/Developer/CommandLineTools/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload")
    else:
        print("\n❌ MongoDB connection failed. Check your .env file.")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
