from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

# Enums
class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    NO_SHOW = "no-show"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"

class ClientReliability(str, Enum):
    RELIABLE = "reliable"
    NEW = "new"
    NEEDS_PROTECTION = "needs-protection"

class TransactionType(str, Enum):
    TIMEHOLD_AUTH = "timehold_auth"
    TIMEHOLD_CAPTURE = "timehold_capture"
    TIMEHOLD_RELEASE = "timehold_release"
    PAYOUT = "payout"
    WALLET_CREDIT = "wallet_credit"

# Base Model Config
class MongoModel(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

# Master (Beauty Professional)
class Master(MongoModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: Optional[str] = None  # Hashed password for auth
    phone: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    location: Optional[str] = None
    booking_slug: str  # e.g., "sophiabrown"
    stripe_connect_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    subscription_active: bool = False
    google_access_token: Optional[str] = None
    google_refresh_token: Optional[str] = None
    google_token_expiry: Optional[datetime] = None
    google_last_sync_at: Optional[datetime] = None
    google_last_sync_status: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    settings: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MasterCreate(BaseModel):
    email: EmailStr
    name: str
    password: str  # Plain password, will be hashed
    phone: Optional[str] = None
    specialty: Optional[str] = None
    booking_slug: str

class MasterLogin(BaseModel):
    email: EmailStr
    password: str

class MasterResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    location: Optional[str] = None
    booking_slug: str
    stripe_connect_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    subscription_active: bool = False
    google_token_expiry: Optional[datetime] = None
    google_last_sync_at: Optional[datetime] = None
    google_last_sync_status: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    settings: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

# Service
class Service(MongoModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    master_id: str
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: float
    base_slotta: float = 0.0  # Calculated Slotta amount
    active: bool = True
    new_clients_only: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceCreate(BaseModel):
    master_id: str
    name: str
    duration_minutes: int
    price: float
    description: Optional[str] = None

# Client
class Client(MongoModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: Optional[str] = None
    total_bookings: int = 0
    completed_bookings: int = 0
    no_shows: int = 0
    cancellations: int = 0
    reliability: ClientReliability = ClientReliability.NEW
    wallet_balance: float = 0.0
    credit_balance: float = 0.0
    stripe_customer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClientCreate(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None

# Booking
class Booking(MongoModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    master_id: str
    client_id: str
    service_id: str
    
    # Booking details
    booking_date: datetime
    duration_minutes: int = 0
    
    # Pricing
    service_price: float = 0.0
    slotta_amount: float = 0.0  # The calculated Slotta hold amount
    
    # Status
    status: BookingStatus = BookingStatus.PENDING
    
    # Payment
    stripe_payment_intent_id: Optional[str] = None
    payment_authorized: bool = False
    google_event_id: Optional[str] = None
    
    # Risk
    risk_score: int = 0  # 0-100
    
    # Policy
    reschedule_deadline: Optional[datetime] = None
    
    # Notes
    notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BookingCreate(BaseModel):
    master_id: str
    client_id: str
    service_id: str
    booking_date: datetime
    notes: Optional[str] = None

class BookingCreateWithPayment(BaseModel):
    """Booking creation with payment method for public booking flow"""
    master_id: str
    service_id: str
    booking_date: datetime
    client_name: str
    client_email: EmailStr
    client_phone: Optional[str] = None
    payment_method_id: str  # Stripe payment method ID
    notes: Optional[str] = None

class BookingReschedule(BaseModel):
    new_date: datetime

# Transaction
class Transaction(MongoModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: Optional[str] = None
    master_id: Optional[str] = None
    client_id: Optional[str] = None
    
    type: TransactionType
    amount: float
    
    stripe_transaction_id: Optional[str] = None
    
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(BaseModel):
    booking_id: Optional[str] = None
    master_id: Optional[str] = None
    client_id: Optional[str] = None
    type: TransactionType
    amount: float
    description: str

# Calendar Block
class CalendarBlockCreate(BaseModel):
    """Create a calendar block to prevent bookings"""
    master_id: str
    start_datetime: datetime
    end_datetime: datetime

# Google Calendar
class GoogleEventCreate(BaseModel):
    summary: str
    start_time: datetime
    end_time: datetime
    description: Optional[str] = None
    reason: Optional[str] = None
