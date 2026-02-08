"""Google Calendar Integration with Two-Way Sync

Allows masters to:
1. Push Slotta bookings to Google Calendar
2. Import Google Calendar events as blocked time

To enable:
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add to .env:
   - GOOGLE_CLIENT_ID=your_client_id
   - GOOGLE_CLIENT_SECRET=your_client_secret
   - GOOGLE_REDIRECT_URI=http://localhost:8001/api/google/oauth/callback
"""

import os
import logging
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from urllib.parse import urlencode

logger = logging.getLogger(__name__)
from logging_utils import log_info, log_error

class GoogleCalendarService:
    
    def __init__(self):
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:8001/api/google/oauth/callback')
        self.enabled = bool(self.client_id and self.client_secret)
        
        if not self.enabled:
            log_error(logger, "google_calendar_disabled", reason="missing_oauth_credentials")
        else:
            log_info(logger, "google_calendar_enabled")
    
    def get_auth_url(self, state: str = "") -> str:
        """Generate OAuth authorization URL"""
        
        if not self.enabled:
            return ""
        
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
            'access_type': 'offline',
            'prompt': 'consent',
            'state': state
        }
        
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> Optional[Dict]:
        """Exchange authorization code for tokens"""
        
        if not self.enabled:
            return {"access_token": "mock_token", "refresh_token": "mock_refresh"}
        
        try:
            import httpx
            
            log_info(logger, "google_oauth_exchange_started")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                        'code': code,
                        'grant_type': 'authorization_code',
                        'redirect_uri': self.redirect_uri
                    }
                )
                
                if response.status_code != 200:
                    log_error(logger, "google_oauth_exchange_failed", status=response.status_code)
                    return None
                    
                tokens = response.json()
                
                log_info(logger, "google_oauth_exchange_success")
                return tokens
                
        except Exception as e:
            log_error(logger, "google_oauth_exchange_exception", error=str(e))
            return None
    
    async def refresh_token(self, refresh_token: str) -> Optional[Dict]:
        """Refresh access token"""
        
        if not self.enabled:
            return {"access_token": "mock_refreshed_token", "expires_in": 3600}
        
        try:
            import httpx
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                        'refresh_token': refresh_token,
                        'grant_type': 'refresh_token'
                    }
                )
                response.raise_for_status()
                tokens = response.json()
                return {
                    "access_token": tokens.get("access_token"),
                    "expires_in": tokens.get("expires_in")
                }
                
        except Exception as e:
            log_error(logger, "google_oauth_refresh_failed", error=str(e))
            return None

    async def update_event(
        self,
        access_token: str,
        event_id: str,
        summary: str,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None
    ) -> bool:
        """Update a calendar event"""
        
        if not self.enabled:
            log_info(logger, "google_calendar_update_mock", event_id=event_id)
            return True
        
        try:
            import httpx
            
            url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}"
            
            event_data = {
                'summary': summary,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'UTC'
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'UTC'
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    url,
                    json=event_data,
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                response.raise_for_status()
            
            log_info(logger, "google_calendar_event_updated", event_id=event_id)
            return True
            
        except Exception as e:
            log_error(logger, "google_calendar_event_update_failed", error=str(e))
            return False
    
    async def create_event(
        self,
        access_token: str,
        summary: str,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None
    ) -> Optional[str]:
        """Create a calendar event"""
        
        if not self.enabled:
            log_info(logger, "google_calendar_create_mock", summary=summary)
            return "mock_event_id_123"
        
        try:
            import httpx
            
            url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
            
            event_data = {
                'summary': summary,
                'description': description,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'UTC'
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'UTC'
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},
                        {'method': 'popup', 'minutes': 60}
                    ]
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=event_data,
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                response.raise_for_status()
                
                event = response.json()
                log_info(logger, "google_calendar_event_created", event_id=event['id'])
                return event['id']
            
        except Exception as e:
            log_error(logger, "google_calendar_event_create_failed", error=str(e))
            return None
    
    async def delete_event(
        self,
        access_token: str,
        event_id: str
    ) -> bool:
        """Delete a calendar event"""
        
        if not self.enabled:
            log_info(logger, "google_calendar_delete_mock", event_id=event_id)
            return True
        
        try:
            import httpx
            
            url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    url,
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                response.raise_for_status()
            
            log_info(logger, "google_calendar_event_deleted", event_id=event_id)
            return True
            
        except Exception as e:
            log_error(logger, "google_calendar_event_delete_failed", error=str(e))
            return False
    
    async def get_events(
        self,
        access_token: str,
        time_min: datetime,
        time_max: datetime
    ) -> List[Dict]:
        """Get calendar events in a time range (for two-way sync)"""
        
        if not self.enabled:
            log_info(logger, "google_calendar_fetch_mock")
            return []
        
        try:
            import httpx
            
            url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
            params = {
                'timeMin': time_min.isoformat() + 'Z',
                'timeMax': time_max.isoformat() + 'Z',
                'singleEvents': 'true',
                'orderBy': 'startTime',
                'maxResults': 250
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params=params,
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                response.raise_for_status()
                
                data = response.json()
                events = data.get('items', [])
                
                log_info(logger, "google_calendar_events_fetched", count=len(events))
                return events
            
        except Exception as e:
            log_error(logger, "google_calendar_events_fetch_failed", error=str(e))
            return []
    
    async def import_events_as_blocks(
        self,
        access_token: str,
        master_id: str,
        db  # Pass database connection
    ) -> int:
        """Import Google Calendar events as blocked time slots (two-way sync)"""
        
        # Fetch events for the next 30 days
        time_min = datetime.utcnow()
        time_max = time_min + timedelta(days=30)
        
        events = await self.get_events(access_token, time_min, time_max)
        
        imported_count = 0
        for event in events:
            # Skip all-day events
            if 'dateTime' not in event.get('start', {}):
                continue
            
            # Skip events created by Slotta (they have Slotta in description)
            if event.get('description', '').startswith('Client:'):
                continue
            
            start_str = event['start']['dateTime']
            end_str = event['end']['dateTime']
            
            # Parse datetime strings
            start_time = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
            
            # Check if block already exists
            existing = await db.calendar_blocks.find_one({
                "master_id": master_id,
                "google_event_id": event['id']
            })
            
            if not existing:
                import uuid
                block = {
                    "id": str(uuid.uuid4()),
                    "master_id": master_id,
                    "start_datetime": start_time,
                    "end_datetime": end_time,
                    "reason": event.get('summary', 'Google Calendar Event'),
                    "google_event_id": event['id'],
                    "created_at": datetime.utcnow()
                }
                await db.calendar_blocks.insert_one(block)
                imported_count += 1
        
        log_info(logger, "google_calendar_events_imported", count=imported_count)
        return imported_count

# Global instance
google_calendar_service = GoogleCalendarService()
