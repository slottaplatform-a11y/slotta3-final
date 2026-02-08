from fastapi import FastAPI, APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional
import hashlib
import jwt
import stripe
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import models and services
from models import (
    Master, MasterCreate, MasterLogin, MasterResponse, Service, ServiceCreate,
    Client, ClientCreate, Booking, BookingCreate, BookingCreateWithPayment,
    Transaction, TransactionCreate, BookingStatus, ClientReliability,
    CalendarBlockCreate, GoogleEventCreate, BookingReschedule
)
from slotta_engine import SlottaEngine
from services import email_service, telegram_service, stripe_service, google_calendar_service

# Environment
APP_ENV = os.environ.get("APP_ENV", "development")
if APP_ENV not in {"development", "staging", "production"}:
    raise RuntimeError("APP_ENV must be one of: development, staging, production")

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format='%(message)s')
logger = logging.getLogger(__name__)
from logging_utils import log_info, log_error

# Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=APP_ENV,
        traces_sample_rate=0.2,
        integrations=[FastApiIntegration()],
    )

# Log sink (optional file in production)
LOG_FILE = os.getenv("LOG_FILE")
if APP_ENV == "production" and LOG_FILE:
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setFormatter(logging.Formatter('%(message)s'))
    logger.addHandler(file_handler)

# Environment-derived URLs
FRONTEND_URL = os.getenv("FRONTEND_URL") or ("http://localhost:3000" if APP_ENV == "development" else "")
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS")
if CORS_ORIGINS_RAW:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]
elif FRONTEND_URL:
    CORS_ORIGINS = [FRONTEND_URL]
else:
    CORS_ORIGINS = ["http://localhost:3000"]

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe settings
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_PRICE_ID_MONTHLY = os.getenv("STRIPE_PRICE_ID_MONTHLY")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Admin settings
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")
ADMIN_ALLOW_TELEGRAM_WEBHOOK = os.getenv("ADMIN_ALLOW_TELEGRAM_WEBHOOK", "false").lower() == "true"

def require_stripe_config():
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

def require_admin(request: Request):
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=500, detail="Admin API key is not configured")
    provided = request.headers.get("x-admin-key")
    if not provided or provided != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

def require_active_subscription(master: dict):
    if not master.get("subscription_active"):
        raise HTTPException(status_code=402, detail="Subscription required for this feature")

async def require_active_subscription_for_master(master_id: str):
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    require_active_subscription(master)

async def get_or_create_stripe_customer(master: dict) -> str:
    require_stripe_config()
    customer_id = master.get("stripe_customer_id")
    if customer_id:
        return customer_id
    customer = stripe.Customer.create(
        email=master.get("email"),
        name=master.get("name"),
        metadata={"master_id": master.get("id")}
    )
    await db.masters.update_one(
        {"id": master["id"]},
        {"$set": {"stripe_customer_id": customer.id, "updated_at": datetime.utcnow()}}
    )
    return customer.id

async def get_valid_google_access_token(master: dict) -> Optional[str]:
    if not google_calendar_service.enabled:
        return None
    access_token = master.get("google_access_token") or master.get("google_calendar_token")
    refresh_token = master.get("google_refresh_token")
    expiry = master.get("google_token_expiry")

    if not access_token and not refresh_token:
        return None

    if expiry and not isinstance(expiry, datetime):
        try:
            expiry = datetime.fromisoformat(str(expiry))
        except Exception:
            expiry = None

    if expiry and isinstance(expiry, datetime):
        if expiry <= datetime.utcnow() + timedelta(minutes=2):
            if refresh_token:
                refreshed = await google_calendar_service.refresh_token(refresh_token)
                if refreshed and refreshed.get("access_token"):
                    new_expiry = datetime.utcnow() + timedelta(seconds=refreshed.get("expires_in", 3600))
                    await db.masters.update_one(
                        {"id": master["id"]},
                        {"$set": {
                            "google_access_token": refreshed.get("access_token"),
                            "google_token_expiry": new_expiry,
                            "updated_at": datetime.utcnow()
                        }}
                    )
                    return refreshed.get("access_token")
                return None
    return access_token

async def delete_google_event_for_booking(booking: dict):
    if not booking.get("google_event_id"):
        return
    master = await db.masters.find_one({"id": booking["master_id"]}, {"_id": 0})
    if not master:
        return
    access_token = await get_valid_google_access_token(master)
    if not access_token:
        return
    ok = await google_calendar_service.delete_event(
        access_token=access_token,
        event_id=booking["google_event_id"]
    )
    if ok:
        await db.bookings.update_one(
            {"id": booking["id"]},
            {"$set": {"google_event_id": None}}
        )
        await log_google_sync(master["id"], "booking_delete", "success", f"Event {booking['google_event_id']} deleted")
    else:
        await log_google_sync(master["id"], "booking_delete", "failure", f"Failed to delete event {booking['google_event_id']}")

async def log_google_sync(master_id: str, action: str, status: str, message: str = ""):
    synced_count = 0
    try:
        await db.google_sync_logs.insert_one({
            "master_id": master_id,
            "action": action,
            "status": status,
            "message": message,
            "created_at": datetime.utcnow()
        })
    except Exception as e:
        logger.error(f"❌ Failed to write google sync log: {e}")

# JWT Settings
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Security
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == password_hash

def create_token(master_id: str, email: str) -> str:
    """Create JWT token"""
    payload = {
        "sub": master_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_master(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated master"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        master_id = payload.get("sub")
        if not master_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        master = await db.masters.find_one(
            {"id": master_id},
            {"_id": 0, "password_hash": 0, "google_access_token": 0, "google_refresh_token": 0}
        )
        if not master:
            raise HTTPException(status_code=401, detail="Master not found")
        
        return master
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Create FastAPI app
app = FastAPI(title="Slotta API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Security Layer: HTTPS redirect (production only)
# ---------------------------------------------------------------------------
if APP_ENV == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

# ---------------------------------------------------------------------------
# Security Layer: Secure headers (Helmet-style)
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ---------------------------------------------------------------------------
# Security Layer: Basic rate limiting + brute-force protection
# ---------------------------------------------------------------------------
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "120"))
BRUTE_FORCE_WINDOW_SECONDS = int(os.getenv("BRUTE_FORCE_WINDOW_SECONDS", "300"))
BRUTE_FORCE_MAX_ATTEMPTS = int(os.getenv("BRUTE_FORCE_MAX_ATTEMPTS", "6"))

_rate_limit_store = {}
_brute_force_store = {}

def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = _get_client_ip(request)
        now = datetime.utcnow().timestamp()
        bucket = _rate_limit_store.get(ip, [])
        bucket = [ts for ts in bucket if now - ts < RATE_LIMIT_WINDOW_SECONDS]
        if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(status_code=429, content={"detail": "Too many requests"})
        bucket.append(now)
        _rate_limit_store[ip] = bucket
        return await call_next(request)

app.add_middleware(RateLimitMiddleware)

def _record_login_attempt(ip: str, email: str):
    key = f"{ip}:{email}"
    now = datetime.utcnow().timestamp()
    attempts = _brute_force_store.get(key, [])
    attempts = [ts for ts in attempts if now - ts < BRUTE_FORCE_WINDOW_SECONDS]
    attempts.append(now)
    _brute_force_store[key] = attempts

def _is_login_blocked(ip: str, email: str) -> bool:
    key = f"{ip}:{email}"
    now = datetime.utcnow().timestamp()
    attempts = _brute_force_store.get(key, [])
    attempts = [ts for ts in attempts if now - ts < BRUTE_FORCE_WINDOW_SECONDS]
    _brute_force_store[key] = attempts
    return len(attempts) >= BRUTE_FORCE_MAX_ATTEMPTS

def _sanitize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return value.strip()

# ---------------------------------------------------------------------------
# Security Layer: Mask internal errors
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def handle_internal_error(request: Request, exc: Exception):
    log_error(logger, "internal_error", error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@api_router.post("/auth/register")
async def register_master(master_input: MasterCreate):
    """Register a new master account"""
    # Input sanitization
    email = (_sanitize_text(master_input.email) or "").lower()
    name = _sanitize_text(master_input.name) or ""
    booking_slug = (_sanitize_text(master_input.booking_slug) or "").lower()

    if len(master_input.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if len(booking_slug) < 3:
        raise HTTPException(status_code=400, detail="Booking slug must be at least 3 characters")
    
    # Check if email already exists
    existing_email = await db.masters.find_one({"email": email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if slug is unique
    existing_slug = await db.masters.find_one({"booking_slug": booking_slug})
    if existing_slug:
        raise HTTPException(status_code=400, detail="Booking slug already taken")
    
    # Create master with hashed password
    master_data = master_input.model_dump()
    password = master_data.pop('password')
    master_data['email'] = email
    master_data['name'] = name
    master_data['booking_slug'] = booking_slug
    master_data['password_hash'] = hash_password(password)
    
    master = Master(**master_data)
    await db.masters.insert_one(master.model_dump())
    
    # Generate token
    token = create_token(master.id, master.email)
    
    log_info(logger, "auth_register", master_id=master.id, email=master.email)
    
    # Return without password_hash
    master_dict = master.model_dump()
    del master_dict['password_hash']
    
    return {
        "token": token,
        "master": master_dict
    }

@api_router.post("/auth/login")
async def login_master(login_data: MasterLogin, request: Request):
    """Login master and get JWT token"""
    email = (_sanitize_text(login_data.email) or "").lower()
    ip = _get_client_ip(request)
    if _is_login_blocked(ip, email):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    
    # Find master by email
    master = await db.masters.find_one({"email": email})
    if not master:
        _record_login_attempt(ip, email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not master.get('password_hash') or not verify_password(login_data.password, master['password_hash']):
        _record_login_attempt(ip, email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    _brute_force_store.pop(f"{ip}:{email}", None)
    
    # Generate token
    token = create_token(master['id'], master['email'])
    
    log_info(logger, "auth_login", master_id=master['id'], email=master['email'])
    
    # Return without password_hash
    del master['password_hash']
    master.pop('google_access_token', None)
    master.pop('google_refresh_token', None)
    del master['_id']
    
    return {
        "token": token,
        "master": master
    }

@api_router.get("/auth/me")
async def get_current_user(current_master: dict = Depends(get_current_master)):
    """Get current authenticated master profile"""
    return current_master

# ============================================================================
# MASTER ENDPOINTS
# ============================================================================

@api_router.post("/masters", response_model=Master, status_code=status.HTTP_201_CREATED)
async def create_master(master_input: MasterCreate):
    """Create a new master (beauty professional)"""
    
    # Check if slug is unique
    existing = await db.masters.find_one({"booking_slug": master_input.booking_slug})
    if existing:
        raise HTTPException(status_code=400, detail="Booking slug already taken")
    
    master = Master(**master_input.model_dump())
    await db.masters.insert_one(master.model_dump())
    
    logger.info(f"✅ Master created: {master.name} ({master.booking_slug})")
    return master

@api_router.get("/masters/{booking_slug}", response_model=Master)
async def get_master_by_slug(booking_slug: str):
    """Get master by booking slug"""
    
    master = await db.masters.find_one({"booking_slug": booking_slug}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    return master

@api_router.get("/masters/id/{master_id}", response_model=Master)
async def get_master(master_id: str):
    """Get master by ID"""
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    return master

# ============================================================================
# SERVICE ENDPOINTS
# ============================================================================

@api_router.post("/services", response_model=Service, status_code=status.HTTP_201_CREATED)
async def create_service(service_input: ServiceCreate, current_master: dict = Depends(get_current_master)):
    """Create a new service"""
    require_active_subscription(current_master)
    if service_input.price <= 0:
        raise HTTPException(status_code=400, detail="Service price must be greater than 0")
    if service_input.duration_minutes <= 0:
        raise HTTPException(status_code=400, detail="Service duration must be greater than 0")
    
    # Calculate base Slotta
    base_slotta = SlottaEngine.calculate_base_slotta(
        service_input.price,
        service_input.duration_minutes
    )
    
    service = Service(
        **service_input.model_dump(),
        base_slotta=base_slotta
    )
    
    await db.services.insert_one(service.model_dump())
    
    logger.info(f"✅ Service created: {service.name} - €{service.price} (Slotta: €{service.base_slotta})")
    return service

@api_router.get("/services/master/{master_id}", response_model=List[Service])
async def get_master_services(master_id: str, active_only: bool = True):
    """Get all services for a master"""
    
    query = {"master_id": master_id}
    if active_only:
        query["active"] = True
    
    services = await db.services.find(query, {"_id": 0}).to_list(100)
    return services

@api_router.get("/services/{service_id}", response_model=Service)
async def get_service(service_id: str):
    """Get service by ID"""
    
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return service

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service_update: ServiceCreate, current_master: dict = Depends(get_current_master)):
    """Update a service"""
    require_active_subscription(current_master)
    if service_update.price <= 0:
        raise HTTPException(status_code=400, detail="Service price must be greater than 0")
    if service_update.duration_minutes <= 0:
        raise HTTPException(status_code=400, detail="Service duration must be greater than 0")
    
    # Check if service exists
    existing = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Calculate new base Slotta
    base_slotta = SlottaEngine.calculate_base_slotta(
        service_update.price,
        service_update.duration_minutes
    )
    
    # Update service
    update_data = service_update.model_dump()
    update_data['base_slotta'] = base_slotta
    
    await db.services.update_one(
        {"id": service_id},
        {"$set": update_data}
    )
    
    updated_service = await db.services.find_one({"id": service_id}, {"_id": 0})
    
    logger.info(f"✅ Service updated: {service_id}")
    return updated_service

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_master: dict = Depends(get_current_master)):
    """Delete a service"""
    require_active_subscription(current_master)
    
    # Check if service exists
    existing = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Soft delete by setting active = false
    await db.services.update_one(
        {"id": service_id},
        {"$set": {"active": False}}
    )
    
    logger.info(f"✅ Service deleted: {service_id}")
    return {"message": "Service deleted successfully"}

@api_router.get("/services/{service_id}", response_model=Service)
async def get_service(service_id: str):
    """Get a service by ID"""
    
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return service

@api_router.put("/masters/{master_id}", response_model=Master)
async def update_master(master_id: str, master_data: dict):
    """Update master profile"""
    
    # Check if master exists
    existing = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Update master
    master_data['updated_at'] = datetime.utcnow()
    await db.masters.update_one(
        {"id": master_id},
        {"$set": master_data}
    )
    
    updated_master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    
    logger.info(f"✅ Master updated: {master_id}")
    return updated_master



# ============================================================================
# CLIENT ENDPOINTS
# ============================================================================

@api_router.post("/clients", response_model=Client, status_code=status.HTTP_201_CREATED)
async def create_client(client_input: ClientCreate):
    """Create or get existing client"""
    if not client_input.name.strip():
        raise HTTPException(status_code=400, detail="Client name is required")
    
    # Check if client exists
    existing = await db.clients.find_one({"email": client_input.email}, {"_id": 0})
    if existing:
        return Client(**existing)
    
    client = Client(**client_input.model_dump())
    await db.clients.insert_one(client.model_dump())
    
    logger.info(f"✅ Client created: {client.name} ({client.email})")
    return client

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    """Get client by ID"""
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client

@api_router.get("/client/{client_id}", response_model=Client)
async def get_client_public(client_id: str):
    """Get client by ID (public alias for client portal)"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@api_router.get("/clients/email/{email}", response_model=Client)
async def get_client_by_email(email: str):
    """Get client by email"""
    
    client = await db.clients.find_one({"email": email}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client

@api_router.get("/client/me", response_model=Client)
async def get_client_me(email: str):
    """Get client profile by email (client portal)"""
    sanitized_email = (_sanitize_text(email) or "").lower()
    client = await db.clients.find_one({"email": sanitized_email}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@api_router.post("/client/update-credit")
async def update_client_credit(payload: dict):
    """Update client credit balance manually"""
    client_id = payload.get("clientId")
    credit_balance = payload.get("credit_balance")
    if not client_id:
        raise HTTPException(status_code=400, detail="clientId is required")
    if credit_balance is None:
        raise HTTPException(status_code=400, detail="credit_balance is required")
    try:
        credit_value = float(credit_balance)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="credit_balance must be a number")
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"credit_balance": credit_value}}
    )
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True, "client": client}

@api_router.post("/client/apply-credit")
async def apply_client_credit(payload: dict):
    """Placeholder for future credit application logic"""
    client_id = payload.get("clientId")
    if not client_id:
        raise HTTPException(status_code=400, detail="clientId is required")
    return {"success": True, "message": "Credit apply placeholder", "clientId": client_id}

@api_router.get("/clients/master/{master_id}", response_model=List[Client])
async def get_master_clients(master_id: str, current_master: dict = Depends(get_current_master)):
    """Get all clients who have booked with this master"""
    require_active_subscription(current_master)
    
    # Find all bookings for this master
    bookings = await db.bookings.find({"master_id": master_id}, {"client_id": 1}).to_list(10000)
    client_ids = list(set(b['client_id'] for b in bookings))
    
    if not client_ids:
        return []
    
    # Get all clients
    clients = await db.clients.find({"id": {"$in": client_ids}}, {"_id": 0}).to_list(1000)
    return clients

# ============================================================================
# BOOKING ENDPOINTS  
# ============================================================================

@api_router.post("/bookings", response_model=Booking, status_code=status.HTTP_201_CREATED)
async def create_booking(booking_input: BookingCreate):
    """Create a new booking"""
    await require_active_subscription_for_master(booking_input.master_id)
    if booking_input.booking_date <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Booking date must be in the future")
    
    # Get service details
    service = await db.services.find_one({"id": booking_input.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Get client details
    client = await db.clients.find_one({"id": booking_input.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get master details
    master = await db.masters.find_one({"id": booking_input.master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Calculate Slotta
    slotta_amount = SlottaEngine.calculate_slotta(
        price=service['price'],
        duration_minutes=service['duration_minutes'],
        client_reliability=client['reliability'],
        no_shows=client['no_shows'],
        cancellations=client['cancellations']
    )
    
    # Calculate risk score
    risk_score = SlottaEngine.calculate_risk_score(
        total_bookings=client['total_bookings'],
        completed_bookings=client['completed_bookings'],
        no_shows=client['no_shows'],
        cancellations=client['cancellations']
    )
    
    # Calculate reschedule deadline (24 hours before)
    reschedule_deadline = booking_input.booking_date - timedelta(hours=24)
    
    # Create booking
    booking = Booking(
        **booking_input.model_dump(),
        duration_minutes=service['duration_minutes'],
        service_price=service['price'],
        slotta_amount=slotta_amount,
        risk_score=risk_score,
        reschedule_deadline=reschedule_deadline
    )
    
    await db.bookings.insert_one(booking.model_dump())
    
    # Update client stats
    await db.clients.update_one(
        {"id": booking_input.client_id},
        {"$inc": {"total_bookings": 1}}
    )
    
    # Send notifications
    await email_service.send_booking_confirmation(
        to_email=client['email'],
        client_name=client['name'],
        master_name=master['name'],
        service_name=service['name'],
        booking_date=booking_input.booking_date.strftime("%A, %B %d, %Y"),
        booking_time=booking_input.booking_date.strftime("%I:%M %p"),
        slotta_amount=slotta_amount
    )
    
    await email_service.send_master_new_booking(
        to_email=master['email'],
        master_name=master['name'],
        client_name=client['name'],
        service_name=service['name'],
        booking_date=booking_input.booking_date.strftime("%A, %B %d, %Y"),
        booking_time=booking_input.booking_date.strftime("%I:%M %p")
    )
    
    # Telegram notification if enabled
    if master.get('telegram_chat_id'):
        await telegram_service.notify_new_booking(
            chat_id=master['telegram_chat_id'],
            client_name=client['name'],
            service_name=service['name'],
            booking_date=booking_input.booking_date.strftime("%A, %B %d"),
            booking_time=booking_input.booking_date.strftime("%I:%M %p")
        )

    # Create Google Calendar event if connected
    access_token = await get_valid_google_access_token(master)
    if access_token:
        end_time = booking_input.booking_date + timedelta(minutes=service['duration_minutes'])
        event_id = await google_calendar_service.create_event(
            access_token=access_token,
            summary=f"{service['name']} - {client['name']}",
            start_time=booking_input.booking_date,
            end_time=end_time,
            description=f"Client: {client['name']}\nEmail: {client.get('email', 'N/A')}\nSlotta: €{slotta_amount}"
        )
        if event_id:
            await db.bookings.update_one(
                {"id": booking.id},
                {"$set": {"google_event_id": event_id}}
            )
            await log_google_sync(master['id'], "booking_create", "success", f"Event {event_id} created")
        else:
            await log_google_sync(master['id'], "booking_create", "failure", "Failed to create event")
    
    log_info(logger, "booking_created", master_id=master['id'], client_id=client['id'], slotta_amount=slotta_amount)
    return booking

@api_router.post("/bookings/with-payment")
async def create_booking_with_payment(booking_input: BookingCreateWithPayment):
    """Create booking with Stripe payment authorization (public booking flow)"""
    await require_active_subscription_for_master(booking_input.master_id)
    if booking_input.booking_date <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Booking date must be in the future")
    
    # Get service
    service = await db.services.find_one({"id": booking_input.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Get master
    master = await db.masters.find_one({"id": booking_input.master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Get or create client
    client = await db.clients.find_one({"email": booking_input.client_email}, {"_id": 0})
    if not client:
        # Create new client
        new_client = Client(
            email=booking_input.client_email,
            name=booking_input.client_name,
            phone=booking_input.client_phone,
            reliability=ClientReliability.NEW
        )
        await db.clients.insert_one(new_client.model_dump())
        client = new_client.model_dump()
        logger.info(f"✅ New client created: {client['name']} ({client['email']})")
    
    # Calculate Slotta amount
    slotta_amount = SlottaEngine.calculate_slotta(
        price=service['price'],
        duration_minutes=service['duration_minutes'],
        client_reliability=client.get('reliability', 'new'),
        no_shows=client.get('no_shows', 0),
        cancellations=client.get('cancellations', 0)
    )
    
    # Calculate risk score
    risk_score = SlottaEngine.calculate_risk_score(
        total_bookings=client.get('total_bookings', 0),
        completed_bookings=client.get('completed_bookings', 0),
        no_shows=client.get('no_shows', 0),
        cancellations=client.get('cancellations', 0)
    )
    
    # Create Stripe payment intent with hold
    payment_intent = await stripe_service.create_payment_intent(
        amount=slotta_amount,
        customer_email=booking_input.client_email,
        metadata={
            'master_id': booking_input.master_id,
            'service_id': booking_input.service_id,
            'client_email': booking_input.client_email,
            'booking_type': 'slotta_hold'
        }
    )
    
    if not payment_intent:
        raise HTTPException(status_code=500, detail="Failed to create payment authorization")
    
    # Confirm the payment intent with the payment method
    if stripe_service.enabled:
        import stripe
        try:
            stripe.PaymentIntent.confirm(
                payment_intent['id'],
                payment_method=booking_input.payment_method_id
            )
            logger.info(f"✅ Payment authorized: {payment_intent['id']}")
        except Exception as e:
            logger.error(f"❌ Payment authorization failed: {e}")
            raise HTTPException(status_code=400, detail=f"Payment authorization failed: {str(e)}")
    
    # Calculate reschedule deadline
    reschedule_deadline = booking_input.booking_date - timedelta(hours=24)
    
    # Create booking
    booking = Booking(
        master_id=booking_input.master_id,
        client_id=client['id'],
        service_id=booking_input.service_id,
        booking_date=booking_input.booking_date,
        duration_minutes=service['duration_minutes'],
        service_price=service['price'],
        slotta_amount=slotta_amount,
        risk_score=risk_score,
        reschedule_deadline=reschedule_deadline,
        stripe_payment_intent_id=payment_intent['id'],
        payment_authorized=True,
        status=BookingStatus.CONFIRMED,
        notes=booking_input.notes
    )
    
    await db.bookings.insert_one(booking.model_dump())
    
    # Update client stats
    await db.clients.update_one(
        {"id": client['id']},
        {"$inc": {"total_bookings": 1}}
    )
    
    # Send notifications
    booking_date_str = booking_input.booking_date.strftime("%A, %B %d, %Y")
    booking_time_str = booking_input.booking_date.strftime("%I:%M %p")
    
    # Email to client
    await email_service.send_booking_confirmation(
        to_email=booking_input.client_email,
        client_name=booking_input.client_name,
        master_name=master['name'],
        service_name=service['name'],
        booking_date=booking_date_str,
        booking_time=booking_time_str,
        slotta_amount=slotta_amount
    )
    
    # Email to master
    await email_service.send_master_new_booking(
        to_email=master['email'],
        master_name=master['name'],
        client_name=booking_input.client_name,
        service_name=service['name'],
        booking_date=booking_date_str,
        booking_time=booking_time_str
    )
    
    # Telegram notification if enabled
    if master.get('telegram_chat_id'):
        await telegram_service.send_new_booking_alert(
            chat_id=master['telegram_chat_id'],
            client_name=booking_input.client_name,
            service_name=service['name'],
            booking_date=booking_date_str,
            booking_time=booking_time_str,
            slotta_amount=slotta_amount
        )
    
    # Create Google Calendar event if connected
    access_token = await get_valid_google_access_token(master)
    if access_token:
        end_time = booking_input.booking_date + timedelta(minutes=service['duration_minutes'])
        event_id = await google_calendar_service.create_event(
            access_token=access_token,
            summary=f"{service['name']} - {booking_input.client_name}",
            start_time=booking_input.booking_date,
            end_time=end_time,
            description=f"Client: {booking_input.client_name}\nEmail: {booking_input.client_email}\nSlotta: €{slotta_amount}"
        )
        if event_id:
            await db.bookings.update_one(
                {"id": booking.id},
                {"$set": {"google_event_id": event_id}}
            )
            await log_google_sync(master['id'], "booking_create", "success", f"Event {event_id} created")
        else:
            await log_google_sync(master['id'], "booking_create", "failure", "Failed to create event")
    
    log_info(logger, "booking_created_with_payment", master_id=master['id'], client_email=booking_input.client_email, slotta_amount=slotta_amount)
    
    return {
        "id": booking.id,
        "status": "confirmed",
        "slotta_amount": slotta_amount,
        "payment_intent_id": payment_intent['id'],
        "message": "Booking confirmed! Payment hold authorized."
    }

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    """Get booking by ID"""
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return booking

@api_router.get("/bookings/master/{master_id}", response_model=List[Booking])
async def get_master_bookings(master_id: str, status: Optional[BookingStatus] = None, current_master: dict = Depends(get_current_master)):
    """Get all bookings for a master"""
    require_active_subscription(current_master)
    
    query = {"master_id": master_id}
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("booking_date", -1).to_list(1000)
    return bookings

@api_router.get("/bookings/client/{client_id}", response_model=List[Booking])
async def get_client_bookings(client_id: str):
    """Get all bookings for a client"""
    
    bookings = await db.bookings.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("booking_date", -1).to_list(1000)
    return bookings

@api_router.get("/bookings/client/email/{email}")
async def get_client_bookings_by_email(email: str):
    """Get all bookings for a client by email"""
    
    client = await db.clients.find_one({"email": email}, {"_id": 0})
    if not client:
        return []
    
    bookings = await db.bookings.find(
        {"client_id": client['id']},
        {"_id": 0}
    ).sort("booking_date", -1).to_list(1000)
    
    # Enrich with service and master details
    enriched = []
    for booking in bookings:
        service = await db.services.find_one({"id": booking['service_id']}, {"_id": 0, "name": 1, "price": 1})
        master = await db.masters.find_one({"id": booking['master_id']}, {"_id": 0, "name": 1, "location": 1})
        enriched.append({
            **booking,
            "service_name": service['name'] if service else "Unknown",
            "service_price": service['price'] if service else 0,
            "master_name": master['name'] if master else "Unknown",
            "master_location": master.get('location') if master else None
        })
    
    return enriched

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, current_master: dict = Depends(get_current_master)):
    """Cancel a booking and release the payment hold"""
    require_active_subscription(current_master)
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['status'] in ['completed', 'cancelled', 'no-show']:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled")
    
    # Check if within reschedule deadline
    if booking.get('reschedule_deadline') and datetime.utcnow() > booking['reschedule_deadline']:
        raise HTTPException(status_code=400, detail="Cancellation deadline has passed")
    
    # Release payment hold
    if booking.get('stripe_payment_intent_id'):
        await stripe_service.cancel_payment(booking['stripe_payment_intent_id'])
    
    # Update booking status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.CANCELLED, "updated_at": datetime.utcnow()}}
    )

    # Remove Google Calendar event if exists
    await delete_google_event_for_booking(booking)
    
    # Update client stats
    await db.clients.update_one(
        {"id": booking['client_id']},
        {"$inc": {"cancellations": 1}}
    )
    
    log_info(logger, "booking_cancelled", booking_id=booking_id)
    return {"message": "Booking cancelled successfully", "payment_released": True}

@api_router.put("/bookings/{booking_id}/reschedule")
async def reschedule_booking(booking_id: str, payload: BookingReschedule, current_master: dict = Depends(get_current_master)):
    """Reschedule a booking and update Google Calendar event if connected"""
    require_active_subscription(current_master)
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['status'] in ['completed', 'cancelled', 'no-show']:
        raise HTTPException(status_code=400, detail="Booking cannot be rescheduled")
    
    if payload.new_date <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="New booking date must be in the future")
    
    service = await db.services.find_one({"id": booking['service_id']}, {"_id": 0})
    client = await db.clients.find_one({"id": booking['client_id']}, {"_id": 0})
    master = await db.masters.find_one({"id": booking['master_id']}, {"_id": 0})
    
    reschedule_deadline = payload.new_date - timedelta(hours=24)
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "booking_date": payload.new_date,
            "reschedule_deadline": reschedule_deadline,
            "status": BookingStatus.RESCHEDULED,
            "updated_at": datetime.utcnow()
        }}
    )
    
    if master and service and client:
        access_token = await get_valid_google_access_token(master)
        if access_token:
            end_time = payload.new_date + timedelta(minutes=service.get('duration_minutes', 60))
            if booking.get("google_event_id"):
                ok = await google_calendar_service.update_event(
                    access_token=access_token,
                    event_id=booking["google_event_id"],
                    summary=f"{service['name']} - {client['name']}",
                    start_time=payload.new_date,
                    end_time=end_time,
                    description=f"Client: {client['name']}\nEmail: {client.get('email', 'N/A')}\nSlotta: €{booking.get('slotta_amount', 0)}"
                )
                await log_google_sync(
                    master["id"],
                    "booking_reschedule",
                    "success" if ok else "failure",
                    f"Updated event {booking.get('google_event_id')}"
                )
            else:
                event_id = await google_calendar_service.create_event(
                    access_token=access_token,
                    summary=f"{service['name']} - {client['name']}",
                    start_time=payload.new_date,
                    end_time=end_time,
                    description=f"Client: {client['name']}\nEmail: {client.get('email', 'N/A')}\nSlotta: €{booking.get('slotta_amount', 0)}"
                )
                if event_id:
                    await db.bookings.update_one(
                        {"id": booking_id},
                        {"$set": {"google_event_id": event_id}}
                    )
                    await log_google_sync(master["id"], "booking_reschedule", "success", f"Created event {event_id}")
    
    log_info(logger, "booking_rescheduled", booking_id=booking_id)
    return {"message": "Booking rescheduled successfully"}

@api_router.put("/bookings/{booking_id}/complete")
async def mark_booking_complete(booking_id: str, current_master: dict = Depends(get_current_master)):
    """Mark booking as completed"""
    require_active_subscription(current_master)
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Update booking status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.COMPLETED, "updated_at": datetime.utcnow()}}
    )

    # Remove Google Calendar event if exists
    await delete_google_event_for_booking(booking)
    
    # Update client stats
    await db.clients.update_one(
        {"id": booking['client_id']},
        {"$inc": {"completed_bookings": 1}}
    )
    
    # Update client reliability
    client = await db.clients.find_one({"id": booking['client_id']}, {"_id": 0})
    new_reliability = SlottaEngine.determine_reliability(
        total_bookings=client['total_bookings'],
        no_shows=client['no_shows']
    )
    await db.clients.update_one(
        {"id": booking['client_id']},
        {"$set": {"reliability": new_reliability}}
    )
    
    # Release payment hold if exists
    if booking.get('stripe_payment_intent_id'):
        await stripe_service.cancel_payment(booking['stripe_payment_intent_id'])
    
    log_info(logger, "booking_completed", booking_id=booking_id)
    return {"message": "Booking marked as completed"}

@api_router.put("/bookings/{booking_id}/no-show")
async def mark_booking_no_show(booking_id: str, current_master: dict = Depends(get_current_master)):
    """Mark booking as no-show and capture Slotta"""
    require_active_subscription(current_master)
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Calculate split
    split = SlottaEngine.calculate_no_show_split(booking['slotta_amount'])
    
    # Update booking status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.NO_SHOW, "updated_at": datetime.utcnow()}}
    )

    # Remove Google Calendar event if exists
    await delete_google_event_for_booking(booking)
    
    # Update client stats
    await db.clients.update_one(
        {"id": booking['client_id']},
        {
            "$inc": {
                "no_shows": 1,
                "wallet_balance": split['client_wallet_credit']
            }
        }
    )
    
    # Update client reliability
    client = await db.clients.find_one({"id": booking['client_id']}, {"_id": 0})
    new_reliability = SlottaEngine.determine_reliability(
        total_bookings=client['total_bookings'],
        no_shows=client['no_shows'] + 1
    )
    await db.clients.update_one(
        {"id": booking['client_id']},
        {"$set": {"reliability": new_reliability}}
    )
    
    # Capture payment if exists
    if booking.get('stripe_payment_intent_id'):
        await stripe_service.capture_payment(
            booking['stripe_payment_intent_id'],
            booking['slotta_amount']
        )
    
    # Create transactions
    master_transaction = Transaction(
        booking_id=booking_id,
        master_id=booking['master_id'],
        type="wallet_credit",
        amount=split['master_compensation'],
        description=f"No-show compensation for booking {booking_id}"
    )
    await db.transactions.insert_one(master_transaction.model_dump())
    
    client_transaction = Transaction(
        booking_id=booking_id,
        client_id=booking['client_id'],
        type="wallet_credit",
        amount=split['client_wallet_credit'],
        description="Wallet credit from no-show"
    )
    await db.transactions.insert_one(client_transaction.model_dump())
    
    # Send notifications
    master = await db.masters.find_one({"id": booking['master_id']}, {"_id": 0})
    client_doc = await db.clients.find_one({"id": booking['client_id']}, {"_id": 0})
    
    await email_service.send_no_show_alert(
        to_email=master['email'],
        master_name=master['name'],
        client_name=client_doc['name'],
        compensation=split['master_compensation'],
        wallet_credit=split['client_wallet_credit']
    )
    
    if master.get('telegram_chat_id'):
        await telegram_service.notify_no_show(
            chat_id=master['telegram_chat_id'],
            client_name=client_doc['name'],
            compensation=split['master_compensation']
        )
    
    log_info(logger, "booking_no_show", booking_id=booking_id, master_compensation=split['master_compensation'], client_wallet_credit=split['client_wallet_credit'])
    return {
        "message": "Booking marked as no-show",
        "master_compensation": split['master_compensation'],
        "client_wallet_credit": split['client_wallet_credit']
    }

# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@api_router.get("/analytics/master/{master_id}")
async def get_master_analytics(master_id: str, current_master: dict = Depends(get_current_master)):
    """Get analytics for a master"""
    require_active_subscription(current_master)
    
    # Get all bookings
    bookings = await db.bookings.find({"master_id": master_id}, {"_id": 0}).to_list(10000)
    
    # Calculate stats
    total_bookings = len(bookings)
    completed = len([b for b in bookings if b['status'] == BookingStatus.COMPLETED])
    no_shows = len([b for b in bookings if b['status'] == BookingStatus.NO_SHOW])
    
    total_slotta_protected = sum(b.get('slotta_amount', 0) for b in bookings)
    
    # Get transactions
    transactions = await db.transactions.find(
        {"master_id": master_id},
        {"_id": 0}
    ).to_list(10000)
    
    wallet_balance = sum(t['amount'] for t in transactions if t['type'] == 'wallet_credit')
    
    return {
        "total_bookings": total_bookings,
        "completed_bookings": completed,
        "no_shows": no_shows,
        "no_show_rate": (no_shows / total_bookings * 100) if total_bookings > 0 else 0,
        "time_protected_eur": total_slotta_protected,
        "wallet_balance": wallet_balance,
        "avg_slotta": total_slotta_protected / total_bookings if total_bookings > 0 else 0
    }

# ============================================================================
# WALLET / TRANSACTIONS ENDPOINTS
# ============================================================================

@api_router.get("/wallet/master/{master_id}")
async def get_master_wallet(master_id: str, current_master: dict = Depends(get_current_master)):
    """Get wallet balance and transactions for a master"""
    require_active_subscription(current_master)
    
    # Get all transactions for this master
    transactions = await db.transactions.find(
        {"master_id": master_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Calculate balances
    total_credits = sum(t['amount'] for t in transactions if t.get('type') in ['wallet_credit', 'payout_received'])
    total_payouts = sum(t['amount'] for t in transactions if t.get('type') == 'payout')
    wallet_balance = total_credits - total_payouts
    
    # Get pending amount from confirmed bookings
    confirmed_bookings = await db.bookings.find(
        {"master_id": master_id, "status": "confirmed"},
        {"_id": 0, "slotta_amount": 1}
    ).to_list(10000)
    pending_amount = sum(b.get('slotta_amount', 0) for b in confirmed_bookings)
    
    # Calculate lifetime earnings
    lifetime_earnings = total_credits
    
    return {
        "wallet_balance": round(wallet_balance, 2),
        "pending_payouts": round(pending_amount, 2),
        "lifetime_earnings": round(lifetime_earnings, 2),
        "transactions": transactions[:50]  # Last 50 transactions
    }

@api_router.get("/transactions/master/{master_id}")
async def get_master_transactions(master_id: str, limit: int = 50, offset: int = 0, current_master: dict = Depends(get_current_master)):
    """Get paginated transactions for a master"""
    require_active_subscription(current_master)
    
    transactions = await db.transactions.find(
        {"master_id": master_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total_count = await db.transactions.count_documents({"master_id": master_id})
    
    return {
        "transactions": transactions,
        "total_count": total_count,
        "limit": limit,
        "offset": offset
    }

# ============================================================================
# STRIPE CONNECT & PAYOUTS
# ============================================================================

@api_router.get("/stripe/connect-status/{master_id}")
async def get_stripe_connect_status(master_id: str, current_master: dict = Depends(get_current_master)):
    """Check if master has Stripe Connect setup"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    account_id = master.get('stripe_connect_id')
    
    # If no account, return not connected
    if not account_id:
        return {
            "connected": False,
            "payouts_enabled": False,
            "account_id": None
        }
    
    # Fetch real status from Stripe
    payouts_enabled = False
    if stripe_service.enabled:
        try:
            import stripe
            account = stripe.Account.retrieve(account_id)
            payouts_enabled = account.payouts_enabled
            
            # Update database with current status
            await db.masters.update_one(
                {"id": master_id},
                {"$set": {"stripe_payouts_enabled": payouts_enabled}}
            )
        except Exception as e:
            logger.error(f"Failed to fetch Stripe account status: {e}")
            payouts_enabled = bool(master.get('stripe_payouts_enabled'))
    
    return {
        "connected": True,
        "payouts_enabled": payouts_enabled,
        "account_id": account_id
    }

@api_router.post("/stripe/create-connect-account/{master_id}")
async def create_stripe_connect_account(master_id: str, current_master: dict = Depends(get_current_master)):
    """Create Stripe Connect Express account for a master"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Check if already has account
    if master.get('stripe_connect_id'):
        return {"already_connected": True, "account_id": master['stripe_connect_id']}
    
    if not stripe_service.enabled:
        return {"mock": True, "message": "Stripe not configured - would create Connect account"}
    
    try:
        import stripe
        
        # Create Express account
        account = stripe.Account.create(
            type="express",
            country="PT",  # Portugal
            email=master['email'],
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            metadata={"master_id": master_id}
        )
        
        # Save account ID
        await db.masters.update_one(
            {"id": master_id},
            {"$set": {"stripe_connect_id": account.id, "updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"✅ Stripe Connect account created: {account.id} for master {master_id}")
        return {"success": True, "account_id": account.id}
        
    except Exception as e:
        logger.error(f"❌ Failed to create Stripe Connect account: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create Stripe account: {str(e)}")

@api_router.get("/stripe/onboarding-link/{master_id}")
async def get_stripe_onboarding_link(master_id: str, return_url: str = "https://slotta.app/master/settings", current_master: dict = Depends(get_current_master)):
    """Get Stripe Connect onboarding link for master"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    if not stripe_service.enabled:
        return {"mock": True, "url": f"{return_url}?stripe_mock=true"}
    
    try:
        import stripe
        
        account_id = master.get('stripe_connect_id')
        
        # Create account if doesn't exist
        if not account_id:
            result = await create_stripe_connect_account(master_id, current_master=current_master)
            account_id = result.get('account_id')
        
        # Create onboarding link
        account_link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=f"{return_url}?refresh=true",
            return_url=f"{return_url}?stripe_connected=true",
            type="account_onboarding",
        )
        
        logger.info(f"✅ Stripe onboarding link created for master {master_id}")
        return {"url": account_link.url, "expires_at": account_link.expires_at}
        
    except Exception as e:
        logger.error(f"❌ Failed to create onboarding link: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create onboarding link: {str(e)}")

@api_router.get("/stripe/dashboard-link/{master_id}")
async def get_stripe_dashboard_link(master_id: str, current_master: dict = Depends(get_current_master)):
    """Get Stripe Express dashboard link for master to manage payouts"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    if not master.get('stripe_connect_id'):
        raise HTTPException(status_code=400, detail="Stripe not connected")
    
    if not stripe_service.enabled:
        return {"mock": True, "url": "https://dashboard.stripe.com/test/express"}
    
    try:
        import stripe
        
        login_link = stripe.Account.create_login_link(master['stripe_connect_id'])
        
        return {"url": login_link.url}
        
    except Exception as e:
        logger.error(f"❌ Failed to create dashboard link: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create dashboard link: {str(e)}")

@api_router.post("/stripe/request-payout/{master_id}")
async def request_payout(master_id: str, amount: Optional[float] = None, current_master: dict = Depends(get_current_master)):
    """Request a payout to master's connected account"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    if not master.get('stripe_connect_id'):
        raise HTTPException(status_code=400, detail="Stripe not connected")
    
    # Get wallet balance
    wallet_data = await get_master_wallet(master_id, current_master=current_master)
    available_balance = wallet_data.get('wallet_balance', 0)
    
    # Determine payout amount
    payout_amount = amount if amount else available_balance
    
    if payout_amount <= 0:
        raise HTTPException(status_code=400, detail="No funds available for payout")
    
    min_payout = float(os.environ.get('MIN_PAYOUT_EUR', 50))
    if payout_amount < min_payout:
        raise HTTPException(status_code=400, detail=f"Minimum payout is €{min_payout}")
    
    if not stripe_service.enabled:
        return {"mock": True, "amount": payout_amount, "message": "Payout would be processed"}
    
    try:
        import stripe
        
        # Create transfer to connected account
        transfer = stripe.Transfer.create(
            amount=int(payout_amount * 100),
            currency="eur",
            destination=master['stripe_connect_id'],
            metadata={"master_id": master_id}
        )
        
        # Record transaction
        transaction = {
            "id": str(datetime.utcnow().timestamp()),
            "master_id": master_id,
            "type": "payout",
            "amount": -payout_amount,  # Negative to reduce balance
            "stripe_transaction_id": transfer.id,
            "description": f"Payout to bank account",
            "created_at": datetime.utcnow()
        }
        await db.transactions.insert_one(transaction)
        
        logger.info(f"✅ Payout of €{payout_amount} processed for master {master_id}")
        return {
            "success": True,
            "amount": payout_amount,
            "transfer_id": transfer.id,
            "message": "Payout initiated - funds will arrive in 2-3 business days"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to process payout: {e}")
        raise HTTPException(status_code=500, detail=f"Payout failed: {str(e)}")

@api_router.put("/masters/{master_id}/bank-details")
async def update_bank_details(master_id: str, iban: str, account_holder: str, bank_name: Optional[str] = None, current_master: dict = Depends(get_current_master)):
    """Update master's bank details for manual payouts (backup option)"""
    require_active_subscription(current_master)
    
    await db.masters.update_one(
        {"id": master_id},
        {"$set": {
            "bank_details": {
                "iban": iban,
                "account_holder": account_holder,
                "bank_name": bank_name
            },
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"✅ Bank details updated for master {master_id}")
    return {"success": True, "message": "Bank details saved"}

# ============================================================================
# STRIPE SUBSCRIPTIONS (SaaS Billing)
# ============================================================================

@api_router.post("/stripe/create-checkout-session")
async def create_checkout_session(current_master: dict = Depends(get_current_master)):
    """Create Stripe Checkout Session for SaaS subscription"""
    require_stripe_config()
    if not STRIPE_PRICE_ID_MONTHLY:
        raise HTTPException(status_code=500, detail="STRIPE_PRICE_ID_MONTHLY is not configured")
    if not FRONTEND_URL:
        raise HTTPException(status_code=500, detail="FRONTEND_URL is not configured")

    customer_id = await get_or_create_stripe_customer(current_master)

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": STRIPE_PRICE_ID_MONTHLY, "quantity": 1}],
        success_url=f"{FRONTEND_URL}/master/settings?billing=success",
        cancel_url=f"{FRONTEND_URL}/master/settings?billing=cancel",
        metadata={"master_id": current_master.get("id")},
        subscription_data={"metadata": {"master_id": current_master.get("id")}}
    )

    return {"url": session.url}


@api_router.post("/stripe/create-portal-session")
async def create_portal_session(current_master: dict = Depends(get_current_master)):
    """Create Stripe Billing Portal session"""
    require_stripe_config()
    if not FRONTEND_URL:
        raise HTTPException(status_code=500, detail="FRONTEND_URL is not configured")

    customer_id = await get_or_create_stripe_customer(current_master)
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{FRONTEND_URL}/master/settings"
    )
    return {"url": session.url}


@api_router.get("/stripe/subscription-status")
async def get_subscription_status(current_master: dict = Depends(get_current_master)):
    """Return current subscription status for master"""
    require_stripe_config()
    customer_id = current_master.get("stripe_customer_id")
    if not customer_id:
        return {"active": False}

    subscriptions = stripe.Subscription.list(customer=customer_id, status="all", limit=10)
    active = any(s.status in ("active", "trialing") for s in subscriptions.data)

    if current_master.get("subscription_active") != active:
        await db.masters.update_one(
            {"id": current_master["id"]},
            {"$set": {"subscription_active": active, "updated_at": datetime.utcnow()}}
        )

    return {"active": active}


@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook for subscription events"""
    require_stripe_config()
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET is not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        logger.error(f"❌ Stripe webhook signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    async def set_subscription_by_customer(customer_id: str, active: bool):
        if not customer_id:
            return
        await db.masters.update_one(
            {"stripe_customer_id": customer_id},
            {"$set": {"subscription_active": active, "updated_at": datetime.utcnow()}}
        )

    if event_type == "checkout.session.completed":
        if data_object.get("mode") == "subscription":
            customer_id = data_object.get("customer")
            master_id = (data_object.get("metadata") or {}).get("master_id")
            if master_id:
                await db.masters.update_one(
                    {"id": master_id},
                    {"$set": {"stripe_customer_id": customer_id, "subscription_active": True, "updated_at": datetime.utcnow()}}
                )
            else:
                await set_subscription_by_customer(customer_id, True)

    elif event_type == "invoice.paid":
        await set_subscription_by_customer(data_object.get("customer"), True)

    elif event_type == "customer.subscription.updated":
        status = data_object.get("status")
        active = status in ("active", "trialing")
        await set_subscription_by_customer(data_object.get("customer"), active)

    elif event_type == "customer.subscription.deleted":
        await set_subscription_by_customer(data_object.get("customer"), False)

    return {"received": True}

# ============================================================================
# TELEGRAM BOT CONNECTION & WEBHOOK
# ============================================================================

@api_router.get("/telegram/bot-info")
async def get_telegram_bot_info():
    """Get Telegram bot info for connection"""
    
    if not telegram_service.enabled:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")
    
    bot_username = "slotta_booking_bot"
    
    return {
        "enabled": True,
        "bot_username": bot_username,
        "connect_url": f"https://t.me/{bot_username}?start=connect"
    }

@api_router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """Handle incoming Telegram updates (webhook)"""
    if not ADMIN_ALLOW_TELEGRAM_WEBHOOK:
        require_admin(request)
    
    try:
        data = await request.json()
        logger.info(f"📨 Telegram webhook received: {data}")
        
        # Extract message data
        message = data.get('message', {})
        chat = message.get('chat', {})
        text = message.get('text', '')
        chat_id = str(chat.get('id', ''))
        first_name = chat.get('first_name', 'there')
        
        if not chat_id:
            return {"ok": True}
        
        # Handle /start command
        if text.startswith('/start'):
            # Send welcome message with chat ID
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
            
            await telegram_service.send_message(chat_id, welcome_message)
            logger.info(f"✅ Sent welcome message to chat_id: {chat_id}")
        
        # Handle /help command
        elif text.startswith('/help'):
            help_message = """
🤖 *Slotta Bot Commands*

/start - Get your Chat ID & setup instructions
/help - Show this help message
/status - Check your connection status

📞 *Support:* Contact your Slotta administrator
            """
            await telegram_service.send_message(chat_id, help_message)
        
        # Handle /status command
        elif text.startswith('/status'):
            # Check if this chat_id is connected to any master
            master = await db.masters.find_one({"telegram_chat_id": chat_id}, {"_id": 0, "name": 1})
            
            if master:
                status_message = f"✅ *Connected!*\n\nYou're receiving notifications for: {master['name']}"
            else:
                status_message = f"❌ *Not connected*\n\nYour Chat ID: `{chat_id}`\n\nGo to Slotta Settings → Telegram to connect."
            
            await telegram_service.send_message(chat_id, status_message)
        
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"❌ Telegram webhook error: {e}")
        return {"ok": True}  # Always return ok to Telegram

@api_router.post("/telegram/set-webhook")
async def set_telegram_webhook(request: Request, webhook_url: str = "https://slotta.app/api/telegram/webhook"):
    """Set the Telegram webhook URL"""
    require_admin(request)
    
    if not telegram_service.enabled:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")
    
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    
    try:
        import httpx
        
        url = f"https://api.telegram.org/bot{bot_token}/setWebhook"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"url": webhook_url})
            result = response.json()
        
        logger.info(f"✅ Telegram webhook set to: {webhook_url}")
        return {"success": True, "result": result}
        
    except Exception as e:
        logger.error(f"❌ Failed to set webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set webhook: {str(e)}")

@api_router.get("/telegram/status/{master_id}")
async def get_telegram_status(master_id: str):
    """Check if master has Telegram connected"""
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    return {
        "connected": bool(master.get('telegram_chat_id')),
        "chat_id": master.get('telegram_chat_id')
    }

@api_router.post("/telegram/connect/{master_id}")
async def connect_telegram(master_id: str, chat_id: str):
    """Connect master's Telegram account by saving their chat_id"""
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Update master with telegram chat_id
    await db.masters.update_one(
        {"id": master_id},
        {"$set": {
            "telegram_chat_id": chat_id,
            "settings.notification_telegram": True,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Send welcome message
    if telegram_service.enabled:
        await telegram_service.send_message(
            chat_id=chat_id,
            message=f"🎉 *Welcome to Slotta!*\n\nYou'll now receive notifications here:\n• New bookings\n• Cancellations\n• No-shows\n• Daily summaries\n\n✨ Your time is now protected!"
        )
    
    logger.info(f"✅ Telegram connected for master {master_id}: {chat_id}")
    return {"success": True, "message": "Telegram connected successfully"}

@api_router.post("/telegram/disconnect/{master_id}")
async def disconnect_telegram(master_id: str):
    """Disconnect master's Telegram"""
    
    await db.masters.update_one(
        {"id": master_id},
        {"$set": {
            "telegram_chat_id": None,
            "settings.notification_telegram": False,
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"✅ Telegram disconnected for master {master_id}")
    return {"success": True, "message": "Telegram disconnected"}

@api_router.post("/telegram/test/{master_id}")
async def test_telegram_notification(master_id: str):
    """Send a test notification to master's Telegram"""
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    if not master.get('telegram_chat_id'):
        raise HTTPException(status_code=400, detail="Telegram not connected")
    
    success = await telegram_service.send_message(
        chat_id=master['telegram_chat_id'],
        message="🔔 *Test Notification*\n\nThis is a test from Slotta!\nYour Telegram notifications are working correctly. ✅"
    )
    
    if success:
        return {"success": True, "message": "Test notification sent"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test notification")

# ============================================================================
# GOOGLE CALENDAR OAUTH
# ============================================================================

@api_router.get("/google/oauth/url")
async def get_google_oauth_url(master_id: str = "", current_master: dict = Depends(get_current_master)):
    """Get Google OAuth authorization URL"""
    require_active_subscription(current_master)
    
    if not google_calendar_service.enabled:
        raise HTTPException(status_code=503, detail="Google Calendar integration not configured")
    if not master_id:
        master_id = current_master["id"]
    auth_url = google_calendar_service.get_auth_url(state=master_id)
    return {"auth_url": auth_url}

# Backwards compatible alias
@api_router.get("/google/auth-url")
async def get_google_auth_url(master_id: str = "", current_master: dict = Depends(get_current_master)):
    return await get_google_oauth_url(master_id=master_id, current_master=current_master)

@api_router.get("/google/oauth/callback")
async def google_oauth_callback(code: str, state: str = ""):
    """Handle Google OAuth callback"""
    from fastapi.responses import RedirectResponse
    
    # Exchange code for tokens
    tokens = await google_calendar_service.exchange_code(code)
    if not tokens:
        # Redirect to settings with error
        if not FRONTEND_URL:
            raise HTTPException(status_code=500, detail="FRONTEND_URL is not configured")
        return RedirectResponse(url=f"{FRONTEND_URL}/master/settings?google_error=failed")
    
    # If state contains master_id, update master's token
    if state:
        master = await db.masters.find_one({"id": state}, {"_id": 0})
        if not master:
            if not FRONTEND_URL:
                raise HTTPException(status_code=500, detail="FRONTEND_URL is not configured")
            return RedirectResponse(url=f"{FRONTEND_URL}/master/settings?google_error=master_not_found")
        if not master.get("subscription_active"):
            if not FRONTEND_URL:
                raise HTTPException(status_code=500, detail="FRONTEND_URL is not configured")
            return RedirectResponse(url=f"{FRONTEND_URL}/master/settings?google_error=subscription_required")
        expires_in = tokens.get('expires_in', 3600)
        update_fields = {
            "google_access_token": tokens.get('access_token'),
            "google_token_expiry": datetime.utcnow() + timedelta(seconds=expires_in),
            "updated_at": datetime.utcnow()
        }
        if tokens.get('refresh_token'):
            update_fields["google_refresh_token"] = tokens.get('refresh_token')
        await db.masters.update_one(
            {"id": state},
            {"$set": update_fields}
        )
        logger.info(f"✅ Google Calendar connected for master: {state}")
    
    # Redirect back to settings page with success
    if not FRONTEND_URL:
        raise HTTPException(status_code=500, detail="FRONTEND_URL is not configured")
    frontend_url = FRONTEND_URL
    return RedirectResponse(url=f"{frontend_url}/master/settings?google_connected=true")

@api_router.get("/google/sync-status/{master_id}")
async def get_google_sync_status(master_id: str, current_master: dict = Depends(get_current_master)):
    """Check if Google Calendar is connected for a master"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    access_token = await get_valid_google_access_token(master)
    return {
        "connected": bool(master.get('google_refresh_token') or access_token),
        "has_token": bool(access_token),
        "last_sync_at": master.get("google_last_sync_at"),
        "last_sync_status": master.get("google_last_sync_status")
    }

@api_router.post("/google/disconnect/{master_id}")
async def disconnect_google_calendar(master_id: str, current_master: dict = Depends(get_current_master)):
    """Disconnect Google Calendar from master account"""
    require_active_subscription(current_master)
    
    await db.masters.update_one(
        {"id": master_id},
        {"$set": {
            "google_access_token": None,
            "google_refresh_token": None,
            "google_token_expiry": None,
            "google_calendar_token": None,
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"✅ Google Calendar disconnected for master: {master_id}")
    return {"success": True, "message": "Google Calendar disconnected"}

@api_router.post("/google/calendar/create")
async def create_google_calendar_event(
    event: GoogleEventCreate,
    current_master: dict = Depends(get_current_master)
):
    """Create a Google Calendar event"""
    require_active_subscription(current_master)
    access_token = await get_valid_google_access_token(current_master)
    if not access_token:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    event_id = await google_calendar_service.create_event(
        access_token=access_token,
        summary=event.summary,
        start_time=event.start_time,
        end_time=event.end_time,
        description=event.description
    )
    if not event_id:
        raise HTTPException(status_code=500, detail="Failed to create calendar event")
    return {"event_id": event_id}


@api_router.put("/google/calendar/update/{event_id}")
async def update_google_calendar_event(
    event_id: str,
    event: GoogleEventCreate,
    current_master: dict = Depends(get_current_master)
):
    """Update a Google Calendar event"""
    require_active_subscription(current_master)
    access_token = await get_valid_google_access_token(current_master)
    if not access_token:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    ok = await google_calendar_service.update_event(
        access_token=access_token,
        event_id=event_id,
        summary=event.summary,
        start_time=event.start_time,
        end_time=event.end_time,
        description=event.description
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update calendar event")
    return {"success": True}


@api_router.delete("/google/calendar/delete/{event_id}")
async def delete_google_calendar_event(
    event_id: str,
    current_master: dict = Depends(get_current_master)
):
    """Delete a Google Calendar event"""
    require_active_subscription(current_master)
    access_token = await get_valid_google_access_token(current_master)
    if not access_token:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    ok = await google_calendar_service.delete_event(
        access_token=access_token,
        event_id=event_id
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete calendar event")
    return {"success": True}

@api_router.post("/google/import-events/{master_id}")
async def import_google_events(master_id: str, current_master: dict = Depends(get_current_master)):
    """Import Google Calendar events as blocked time (two-way sync: Google → Slotta)"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    access_token = await get_valid_google_access_token(master)
    if not access_token:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    try:
        imported_count = await google_calendar_service.import_events_as_blocks(
            access_token=access_token,
            master_id=master_id,
            db=db
        )
        await db.masters.update_one(
            {"id": master_id},
            {"$set": {"google_last_sync_at": datetime.utcnow(), "google_last_sync_status": "success"}}
        )
        await log_google_sync(master_id, "import_events", "success", f"Imported {imported_count} events")
    except Exception as e:
        await db.masters.update_one(
            {"id": master_id},
            {"$set": {"google_last_sync_at": datetime.utcnow(), "google_last_sync_status": "failure"}}
        )
        await log_google_sync(master_id, "import_events", "failure", str(e))
        raise
    
    return {
        "success": True,
        "imported_count": imported_count,
        "message": f"Imported {imported_count} events as blocked time"
    }

@api_router.post("/google/sync-bookings/{master_id}")
async def sync_bookings_to_google(master_id: str, current_master: dict = Depends(get_current_master)):
    """Push all Slotta bookings to Google Calendar (two-way sync: Slotta → Google)"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    access_token = await get_valid_google_access_token(master)
    if not access_token:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    try:
        # Get all confirmed bookings that don't have a google_event_id yet
        bookings = await db.bookings.find({
            "master_id": master_id,
            "status": {"$in": ["confirmed", "pending"]},
            "google_event_id": {"$exists": False}
        }, {"_id": 0}).to_list(100)
        
        for booking in bookings:
            # Get service and client details
            service = await db.services.find_one({"id": booking['service_id']}, {"_id": 0})
            client = await db.clients.find_one({"id": booking['client_id']}, {"_id": 0})
            
            if not service or not client:
                continue
            
            # Create Google Calendar event
            end_time = booking['booking_date'] + timedelta(minutes=service.get('duration_minutes', 60))
            
            event_id = await google_calendar_service.create_event(
                access_token=access_token,
                summary=f"{service['name']} - {client['name']}",
                start_time=booking['booking_date'],
                end_time=end_time,
                description=f"Client: {client['name']}\nEmail: {client.get('email', 'N/A')}\nSlotta: €{booking.get('slotta_amount', 0)}"
            )
            
            if event_id:
                # Update booking with Google event ID
                await db.bookings.update_one(
                    {"id": booking['id']},
                    {"$set": {"google_event_id": event_id}}
                )
                synced_count += 1
        
        await db.masters.update_one(
            {"id": master_id},
            {"$set": {"google_last_sync_at": datetime.utcnow(), "google_last_sync_status": "success"}}
        )
        await log_google_sync(master_id, "sync_bookings", "success", f"Synced {synced_count} bookings")
    except Exception as e:
        await db.masters.update_one(
            {"id": master_id},
            {"$set": {"google_last_sync_at": datetime.utcnow(), "google_last_sync_status": "failure"}}
        )
        await log_google_sync(master_id, "sync_bookings", "failure", str(e))
        raise
    
    logger.info(f"✅ Synced {synced_count} bookings to Google Calendar for master: {master_id}")
    return {
        "success": True,
        "synced_count": synced_count,
        "message": f"Synced {synced_count} bookings to Google Calendar"
    }

@api_router.post("/google/full-sync/{master_id}")
async def full_calendar_sync(master_id: str, current_master: dict = Depends(get_current_master)):
    """Full two-way sync: Slotta ↔ Google Calendar"""
    require_active_subscription(current_master)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    access_token = await get_valid_google_access_token(master)
    if not access_token:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    
    try:
        # Step 1: Push Slotta bookings to Google
        sync_result = await sync_bookings_to_google(master_id, current_master=current_master)
        
        # Step 2: Import Google events as blocked time
        import_result = await import_google_events(master_id, current_master=current_master)
        
        await db.masters.update_one(
            {"id": master_id},
            {"$set": {"google_last_sync_at": datetime.utcnow(), "google_last_sync_status": "success"}}
        )
        await log_google_sync(master_id, "full_sync", "success", "Two-way sync completed")
        
        return {
            "success": True,
            "bookings_synced_to_google": sync_result.get("synced_count", 0),
            "events_imported_from_google": import_result.get("imported_count", 0),
            "message": "Two-way sync completed successfully"
        }
    except Exception as e:
        await db.masters.update_one(
            {"id": master_id},
            {"$set": {"google_last_sync_at": datetime.utcnow(), "google_last_sync_status": "failure"}}
        )
        await log_google_sync(master_id, "full_sync", "failure", str(e))
        raise

# ============================================================================
# DAILY SUMMARY SCHEDULER (Quick Stats at 8:00 AM in master's timezone)
# ============================================================================

@api_router.post("/admin/send-daily-summaries")
async def send_daily_summaries(request: Request):
    """Send daily summary emails to all masters at 8:00 AM in their timezone"""
    require_admin(request)
    
    try:
        from zoneinfo import ZoneInfo
    except ImportError:
        from backports.zoneinfo import ZoneInfo
    
    # Get all masters with email notifications enabled
    masters = await db.masters.find(
        {"settings.daily_summary_enabled": {"$ne": False}},
        {"_id": 0}
    ).to_list(10000)
    
    sent_count = 0
    skipped_count = 0
    now_utc = datetime.utcnow()
    
    for master in masters:
        # Get master's timezone (default to UTC)
        master_tz = master.get('settings', {}).get('timezone', 'UTC')
        summary_time = master.get('settings', {}).get('summary_time', '08:00')
        
        try:
            tz = ZoneInfo(master_tz)
            now_local = datetime.now(tz)
            
            # Check if it's 8:00 AM (or configured time) in master's timezone
            target_hour, target_minute = map(int, summary_time.split(':'))
            
            # Only send if within the target hour (allows for some scheduling flexibility)
            if now_local.hour != target_hour:
                skipped_count += 1
                continue
                
        except Exception as e:
            logger.warning(f"Invalid timezone {master_tz} for master {master['id']}: {e}")
            # Fall back to UTC
            tz = ZoneInfo('UTC')
            now_local = datetime.now(tz)
        
        # Get today's bookings in master's local time
        today_local = now_local.date()
        start_of_day = datetime.combine(today_local, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        bookings = await db.bookings.find({
            "master_id": master['id'],
            "booking_date": {"$gte": start_of_day, "$lt": end_of_day},
            "status": {"$in": ["confirmed", "pending"]}
        }, {"_id": 0}).sort("booking_date", 1).to_list(100)
        
        # Format bookings for email
        upcoming = []
        for b in bookings:
            service = await db.services.find_one({"id": b['service_id']}, {"_id": 0, "name": 1})
            client = await db.clients.find_one({"id": b['client_id']}, {"_id": 0, "name": 1})
            upcoming.append({
                "time": b['booking_date'].strftime("%H:%M"),
                "client": client['name'] if client else "Client",
                "service": service['name'] if service else "Service"
            })
        
        # Get analytics
        analytics = await db.bookings.aggregate([
            {"$match": {"master_id": master['id'], "status": "confirmed"}},
            {"$group": {"_id": None, "total_slotta": {"$sum": "$slotta_amount"}}}
        ]).to_list(1)
        
        time_protected = analytics[0]['total_slotta'] if analytics else 0
        
        # Get pending payouts
        wallet = await db.transactions.aggregate([
            {"$match": {"master_id": master['id']}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        pending_payouts = wallet[0]['total'] if wallet else 0
        
        # Send email
        success = await email_service.send_daily_summary(
            to_email=master['email'],
            master_name=master['name'],
            upcoming_bookings=upcoming,
            time_protected=time_protected,
            pending_payouts=pending_payouts
        )
        
        if success:
            sent_count += 1
    
    logger.info(f"✅ Daily summaries sent to {sent_count} masters (skipped {skipped_count} - wrong time)")
    return {"success": True, "sent_count": sent_count, "skipped_count": skipped_count}

@api_router.post("/admin/test-daily-summary/{master_id}")
async def test_daily_summary(master_id: str, request: Request):
    """Send a test daily summary to a specific master (for testing)"""
    require_admin(request)
    
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Get today's bookings
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = start_of_day + timedelta(days=1)
    
    bookings = await db.bookings.find({
        "master_id": master['id'],
        "booking_date": {"$gte": start_of_day, "$lt": end_of_day},
        "status": {"$in": ["confirmed", "pending"]}
    }, {"_id": 0}).sort("booking_date", 1).to_list(100)
    
    # Format bookings
    upcoming = []
    for b in bookings:
        service = await db.services.find_one({"id": b['service_id']}, {"_id": 0, "name": 1})
        client = await db.clients.find_one({"id": b['client_id']}, {"_id": 0, "name": 1})
        upcoming.append({
            "time": b['booking_date'].strftime("%H:%M"),
            "client": client['name'] if client else "Client",
            "service": service['name'] if service else "Service"
        })
    
    # Get analytics
    analytics = await db.bookings.aggregate([
        {"$match": {"master_id": master['id'], "status": "confirmed"}},
        {"$group": {"_id": None, "total_slotta": {"$sum": "$slotta_amount"}}}
    ]).to_list(1)
    
    time_protected = analytics[0]['total_slotta'] if analytics else 0
    
    # Get pending payouts
    wallet = await db.transactions.aggregate([
        {"$match": {"master_id": master['id']}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    pending_payouts = wallet[0]['total'] if wallet else 0
    
    # Send email
    success = await email_service.send_daily_summary(
        to_email=master['email'],
        master_name=master['name'],
        upcoming_bookings=upcoming,
        time_protected=time_protected,
        pending_payouts=pending_payouts
    )
    
    if success:
        return {"success": True, "message": f"Test daily summary sent to {master['email']}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email")

# ============================================================================
# HEALTH CHECK
# ============================================================================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "email": email_service.enabled,
            "telegram": telegram_service.enabled,
            "stripe": stripe_service.enabled,
            "google_calendar": google_calendar_service.enabled
        }
    }

# ============================================================================
# MESSAGING ENDPOINTS
# ============================================================================

@api_router.post("/messages/send")
async def send_message_to_client(
    master_id: str,
    client_id: str,
    booking_id: Optional[str] = None,
    message: str = ""
):
    """Send message to client via email/Telegram"""
    
    # Get master and client
    master = await db.masters.find_one({"id": master_id}, {"_id": 0})
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    if not master or not client:
        raise HTTPException(status_code=404, detail="Master or client not found")
    
    # Send via email
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        
        email_message = Mail(
            from_email=os.getenv('FROM_EMAIL', 'noreply@slotta.app'),
            to_emails=client['email'],
            subject=f"Message from {master['name']}",
            html_content=f'''
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8b5cf6;">Message from {master['name']}</h2>
                <p>Hi {client['name']},</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    {message}
                </div>
                <p>Reply to this email to contact {master['name']} directly.</p>
                <p style="color: #6b7280; font-size: 12px;">Slotta - Smart scheduling for professionals.</p>
            </div>
            ''')
        
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        response = sg.send(email_message)
        
        logger.info(f"✅ Message sent to {client['email']}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send email: {e}")
    
    # Store message in database
    message_doc = {
        "id": str(datetime.utcnow().timestamp()),
        "master_id": master_id,
        "client_id": client_id,
        "booking_id": booking_id,
        "message": message,
        "sent_at": datetime.utcnow()
    }
    await db.messages.insert_one(message_doc)
    
    return {"message": "Message sent successfully"}

# ============================================================================
# CALENDAR BLOCK ENDPOINTS
# ============================================================================

@api_router.post("/calendar/blocks")
async def create_calendar_block(block_data: CalendarBlockCreate, current_master: dict = Depends(get_current_master)):
    """Block time on calendar"""
    require_active_subscription(current_master)
    
    block = {
        "id": str(datetime.utcnow().timestamp()),
        "master_id": block_data.master_id,
        "start_datetime": block_data.start_datetime,
        "end_datetime": block_data.end_datetime,
        "reason": block_data.reason,
        "created_at": datetime.utcnow()
    }
    
    await db.calendar_blocks.insert_one(block)
    
    logger.info(f"✅ Calendar blocked: {block_data.master_id} from {block_data.start_datetime} to {block_data.end_datetime}")
    return {"message": "Time blocked successfully", "block_id": block['id']}

@api_router.get("/calendar/blocks/master/{master_id}")
async def get_master_calendar_blocks(master_id: str, current_master: dict = Depends(get_current_master)):
    """Get all calendar blocks for a master"""
    require_active_subscription(current_master)
    
    blocks = await db.calendar_blocks.find(
        {"master_id": master_id},
        {"_id": 0}
    ).sort("start_datetime", 1).to_list(1000)
    
    return blocks

@api_router.delete("/calendar/blocks/{block_id}")
async def delete_calendar_block(block_id: str, current_master: dict = Depends(get_current_master)):
    """Delete a calendar block"""
    require_active_subscription(current_master)
    
    result = await db.calendar_blocks.delete_one({"id": block_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    
    logger.info(f"✅ Calendar block deleted: {block_id}")
    return {"message": "Block deleted successfully"}


@api_router.get("/")
async def root():
    return {
        "message": "Slotta API v1.0",
        "docs": "/docs",
        "health": "/api/health"
    }

@api_router.post("/seed/demo")
async def seed_demo_data(request: Request):
    """Seed demo data for sophiabrown - the live demo master"""
    require_admin(request)
    
    # Check if sophiabrown already exists
    existing = await db.masters.find_one({"booking_slug": "sophiabrown"})
    if existing:
        return {"message": "Demo data already exists", "master_id": existing['id']}
    
    # Create demo master: Sophia Brown
    demo_master_id = str(datetime.utcnow().timestamp())
    demo_master = {
        "id": demo_master_id,
        "email": "sophia@slotta.app",
        "name": "Sophia Brown",
        "password_hash": hash_password("demo123"),  # Demo password
        "phone": "+1-555-0123",
        "specialty": "Hair Styling & Coloring",
        "bio": "Award-winning stylist with 10+ years experience. Specializing in balayage, creative cuts, and bridal styling.",
        "photo_url": "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400",
        "location": "Manhattan, NY",
        "booking_slug": "sophiabrown",
        "telegram_chat_id": None,
        "settings": {
            "reminder_hours": 24,
            "timezone": "America/New_York",
            "notification_email": True,
            "notification_telegram": False
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.masters.insert_one(demo_master)
    logger.info(f"✅ Created demo master: Sophia Brown (sophiabrown)")
    
    # Create demo services
    demo_services = [
        {
            "id": f"service_{demo_master_id}_1",
            "master_id": demo_master_id,
            "name": "Balayage & Highlights",
            "description": "Sun-kissed, natural-looking highlights using the balayage technique.",
            "duration_minutes": 180,
            "price": 250.0,
            "base_slotta": 75.0,  # 30% of price
            "active": True,
            "new_clients_only": False,
            "created_at": datetime.utcnow()
        },
        {
            "id": f"service_{demo_master_id}_2",
            "master_id": demo_master_id,
            "name": "Haircut & Styling",
            "description": "Precision cut tailored to your face shape, includes wash and style.",
            "duration_minutes": 60,
            "price": 85.0,
            "base_slotta": 25.0,
            "active": True,
            "new_clients_only": False,
            "created_at": datetime.utcnow()
        },
        {
            "id": f"service_{demo_master_id}_3",
            "master_id": demo_master_id,
            "name": "Bridal Package",
            "description": "Complete bridal hair styling including trial session.",
            "duration_minutes": 240,
            "price": 500.0,
            "base_slotta": 150.0,
            "active": True,
            "new_clients_only": False,
            "created_at": datetime.utcnow()
        },
        {
            "id": f"service_{demo_master_id}_4",
            "master_id": demo_master_id,
            "name": "Color Refresh",
            "description": "Root touch-up and color refresh to maintain your perfect shade.",
            "duration_minutes": 90,
            "price": 120.0,
            "base_slotta": 36.0,
            "active": True,
            "new_clients_only": False,
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.services.insert_many(demo_services)
    logger.info(f"✅ Created {len(demo_services)} demo services")
    
    return {
        "message": "Demo data seeded successfully!",
        "master_id": demo_master_id,
        "master_email": "sophia@slotta.app",
        "booking_url": "/sophiabrown",
        "services_count": len(demo_services)
    }

# Include router
app.include_router(api_router)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Slotta API starting...")
    logger.info(f"📧 Email service: {'✅ Enabled' if email_service.enabled else '❌ Disabled (add SENDGRID_API_KEY)'}")
    logger.info(f"🤖 Telegram bot: {'✅ Enabled' if telegram_service.enabled else '❌ Disabled (add TELEGRAM_BOT_TOKEN)'}")
    logger.info(f"💳 Stripe: {'✅ Enabled' if stripe_service.enabled else '❌ Disabled (add STRIPE_SECRET_KEY)'}")
    logger.info(f"📅 Google Calendar: {'✅ Enabled' if google_calendar_service.enabled else '❌ Disabled (add GOOGLE_CLIENT_ID)'}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("👋 Slotta API shutting down...")
