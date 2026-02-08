"""
Telegram Bot Polling Script for Slotta

Run this script to enable the bot to respond to /start commands.
This is used when webhook isn't available.

Usage: python telegram_bot.py
"""

import os
import asyncio
import logging
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment
from dotenv import load_dotenv
load_dotenv()

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'slotta_db')

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def send_message(chat_id: str, text: str):
    """Send a message via Telegram bot"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    async with httpx.AsyncClient() as http_client:
        response = await http_client.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown"
        })
        return response.json()

async def handle_update(update: dict):
    """Process a single Telegram update"""
    message = update.get('message', {})
    chat = message.get('chat', {})
    text = message.get('text', '')
    chat_id = str(chat.get('id', ''))
    first_name = chat.get('first_name', 'there')
    
    if not chat_id:
        return
    
    # Handle /start command
    if text.startswith('/start'):
        welcome_message = f"""
🎉 *Welcome to Slotta!*

Hello {first_name}!

Your Chat ID is:
`{chat_id}`

📋 *To connect notifications:*
1. Copy your Chat ID above
2. Go to Slotta → Settings → Telegram
3. Paste your Chat ID

Once connected, you'll receive:
• 🆕 New booking alerts
• ❌ Cancellation notices
• ⚠️ No-show alerts
• 📊 Daily summaries

✨ Your time will be protected!
        """
        await send_message(chat_id, welcome_message)
        logger.info(f"✅ Sent welcome to {first_name} (chat_id: {chat_id})")
    
    # Handle /help command
    elif text.startswith('/help'):
        help_message = """
🤖 *Slotta Bot Commands*

/start - Get your Chat ID & setup instructions
/help - Show this help message
/status - Check your connection status

📞 *Support:* Contact your Slotta administrator
        """
        await send_message(chat_id, help_message)
    
    # Handle /status command
    elif text.startswith('/status'):
        master = await db.masters.find_one({"telegram_chat_id": chat_id}, {"_id": 0, "name": 1})
        
        if master:
            status_message = f"✅ *Connected!*\n\nYou're receiving notifications for: {master['name']}"
        else:
            status_message = f"❌ *Not connected*\n\nYour Chat ID: `{chat_id}`\n\nGo to Slotta Settings → Telegram to connect."
        
        await send_message(chat_id, status_message)

async def poll_updates():
    """Long polling for Telegram updates"""
    logger.info("🤖 Starting Slotta Telegram Bot (polling mode)...")
    
    offset = None
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        while True:
            try:
                params = {"timeout": 30}
                if offset:
                    params["offset"] = offset
                
                response = await http_client.get(url, params=params)
                data = response.json()
                
                if data.get('ok') and data.get('result'):
                    for update in data['result']:
                        await handle_update(update)
                        offset = update['update_id'] + 1
                
            except Exception as e:
                logger.error(f"❌ Polling error: {e}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(poll_updates())
