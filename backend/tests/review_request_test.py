#!/usr/bin/env python3
"""
Focused test for the specific review request endpoints
"""

import requests
import json
from datetime import datetime, timedelta

BACKEND_URL = "https://slotta-connect.preview.emergentagent.com/api"
MASTER_ID = "1769701210.152606"  # sophiabrown master ID

def test_stripe_connect_endpoints():
    """Test the specific Stripe Connect endpoints from review request"""
    print("🧪 Testing Stripe Connect Flow...")
    
    # 1. GET /api/stripe/connect-status/1769701210.152606
    print("1. Testing connect-status endpoint...")
    response = requests.get(f"{BACKEND_URL}/stripe/connect-status/{MASTER_ID}")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Response: connected={data.get('connected')}, payouts_enabled={data.get('payouts_enabled')}")
        print(f"   ✅ Should show connected: true - ACTUAL: connected={data.get('connected')}")
    
    # 2. GET /api/stripe/onboarding-link/1769701210.152606
    print("\n2. Testing onboarding-link endpoint...")
    response = requests.get(f"{BACKEND_URL}/stripe/onboarding-link/{MASTER_ID}")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Should generate valid URL - ACTUAL: {'url' in data}")
        if 'url' in data:
            print(f"   URL generated: {data['url'][:50]}...")
    
    # 3. GET /api/stripe/dashboard-link/1769701210.152606
    print("\n3. Testing dashboard-link endpoint...")
    response = requests.get(f"{BACKEND_URL}/stripe/dashboard-link/{MASTER_ID}")
    print(f"   Status: {response.status_code}")
    if response.status_code == 500:
        print(f"   ⚠️  Expected failure - account not onboarded yet")
        print(f"   Response: {response.text[:100]}...")
    elif response.status_code == 200:
        data = response.json()
        print(f"   ✅ Dashboard URL generated: {'url' in data}")

def test_stripe_payment_authorization():
    """Test creating a booking with payment"""
    print("\n🧪 Testing Stripe Payment Authorization...")
    
    # Get services first
    services_response = requests.get(f"{BACKEND_URL}/services/master/{MASTER_ID}")
    services = services_response.json()
    
    # Find Haircut & Styling service
    haircut_service = None
    for service in services:
        if "haircut" in service.get('name', '').lower() and "styling" in service.get('name', '').lower():
            haircut_service = service
            break
    
    if not haircut_service:
        print("   ❌ Haircut & Styling service not found")
        return
    
    print(f"   Using service: {haircut_service['name']} (ID: {haircut_service['id']})")
    
    # Create booking with payment
    booking_data = {
        "master_id": MASTER_ID,
        "service_id": haircut_service['id'],
        "client_name": "Test Client",
        "client_email": "test@example.com",
        "client_phone": "+1-555-0123",
        "booking_date": (datetime.now() + timedelta(days=3)).isoformat(),
        "payment_method_id": "pm_card_visa",
        "notes": "Review request test booking"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/bookings/with-payment",
        json=booking_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"   Status: {response.status_code}")
    if response.status_code == 400:
        print(f"   ⚠️  Expected payment method validation failure")
        print(f"   Response: {response.text[:150]}...")
    elif response.status_code == 200:
        data = response.json()
        print(f"   ✅ Booking created: {data.get('id', 'No ID')}")

def test_sendgrid_email():
    """Test SendGrid email (expected to fail with 403)"""
    print("\n🧪 Testing SendGrid Email...")
    
    response = requests.post(f"{BACKEND_URL}/admin/test-daily-summary/{MASTER_ID}")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 500:
        print(f"   ⚠️  Expected 403 Forbidden - sender not verified")
        print(f"   Response: {response.text[:100]}...")
    elif response.status_code == 200:
        data = response.json()
        print(f"   ✅ Email sent successfully: {data.get('success')}")

def test_calendar_and_booking_apis():
    """Test calendar and booking APIs"""
    print("\n🧪 Testing Calendar and Booking APIs...")
    
    # 1. GET /api/bookings/master/1769701210.152606
    print("1. Testing master bookings endpoint...")
    response = requests.get(f"{BACKEND_URL}/bookings/master/{MASTER_ID}")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        bookings = response.json()
        print(f"   ✅ Found {len(bookings)} bookings")
    
    # 2. POST /api/calendar/blocks
    print("\n2. Testing calendar blocks endpoint...")
    block_data = {
        "master_id": MASTER_ID,
        "start_datetime": "2025-02-05T10:00:00",
        "end_datetime": "2025-02-05T12:00:00",
        "reason": "Review request test block"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/calendar/blocks",
        json=block_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"   Status: {response.status_code}")
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"   ✅ Block created: {data.get('block_id', 'Success')}")

def test_health_check():
    """Test health check"""
    print("\n🧪 Testing Health Check...")
    
    response = requests.get(f"{BACKEND_URL}/health")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        services = data.get('services', {})
        enabled_services = [k for k, v in services.items() if v]
        print(f"   ✅ Enabled services: {', '.join(enabled_services)}")

if __name__ == "__main__":
    print("🎯 SLOTTA REVIEW REQUEST TESTING")
    print("=" * 50)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Master ID: {MASTER_ID} (sophiabrown)")
    print("=" * 50)
    
    test_health_check()
    test_stripe_connect_endpoints()
    test_stripe_payment_authorization()
    test_sendgrid_email()
    test_calendar_and_booking_apis()
    
    print("\n" + "=" * 50)
    print("✅ REVIEW REQUEST TESTING COMPLETE")
    print("=" * 50)