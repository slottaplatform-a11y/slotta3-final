"""Telegram Bot Integration

To enable:
1. Open Telegram and search for @BotFather
2. Send /newbot and follow instructions
3. Copy the API token
4. Add to .env: TELEGRAM_BOT_TOKEN=your_token_here
5. Start your bot and send /start to get your chat_id
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class TelegramService:
    
    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.enabled = bool(self.bot_token)
        
        if not self.enabled:
            logger.warning("⚠️  Telegram bot disabled: TELEGRAM_BOT_TOKEN not found in .env")
            logger.info("🤖 To enable Telegram: Get token from @BotFather on Telegram")
    
    async def send_message(
        self,
        chat_id: str,
        message: str
    ) -> bool:
        """Send a message via Telegram bot"""
        
        if not self.enabled:
            logger.info(f"[MOCK] Would send Telegram message to {chat_id}: {message[:50]}...")
            return True
        
        try:
            import httpx
            
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={
                        "chat_id": chat_id,
                        "text": message,
                        "parse_mode": "Markdown"
                    }
                )
                response.raise_for_status()
            
            logger.info(f"✅ Telegram message sent to {chat_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send Telegram message: {e}")
            return False
    
    async def notify_new_booking(
        self,
        chat_id: str,
        client_name: str,
        service_name: str,
        booking_date: str,
        booking_time: str
    ) -> bool:
        """Send new booking notification"""
        
        message = f"""
🆕 *New Booking!*

👤 Client: {client_name}
💼 Service: {service_name}
📅 Date: {booking_date}
🕐 Time: {booking_time}

✨ Slotta is protecting your time!
        """
        
        return await self.send_message(chat_id, message)
    
    async def send_new_booking_alert(
        self,
        chat_id: str,
        client_name: str,
        service_name: str,
        booking_date: str,
        booking_time: str,
        slotta_amount: float
    ) -> bool:
        """Send new booking alert with Slotta amount"""
        
        message = f"""
🆕 *New Booking Alert!*

👤 Client: {client_name}
💼 Service: {service_name}
📅 Date: {booking_date}
🕐 Time: {booking_time}
💰 Slotta Hold: €{slotta_amount}

✨ Your time is protected!
        """
        
        return await self.send_message(chat_id, message)
    
    async def notify_no_show(
        self,
        chat_id: str,
        client_name: str,
        compensation: float
    ) -> bool:
        """Send no-show alert"""
        
        message = f"""
⚠️ *No-Show Alert*

👤 Client: {client_name}
💰 Your compensation: €{compensation}

Slotta has been captured and added to your wallet.
        """
        
        return await self.send_message(chat_id, message)
    
    async def notify_reschedule_request(
        self,
        chat_id: str,
        client_name: str,
        original_date: str,
        new_date: str
    ) -> bool:
        """Send reschedule request notification"""
        
        message = f"""
🔄 *Reschedule Request*

👤 Client: {client_name}
📅 Original: {original_date}
📅 New request: {new_date}

Please review in your dashboard.
        """
        
        return await self.send_message(chat_id, message)

# Global instance
telegram_service = TelegramService()
