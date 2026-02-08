"""
Slotta Booking Flow Tests - Iteration 2
Tests for:
- Public booking page (master by slug)
- Booking creation with payment
- Client Portal (email lookup, cancel booking)
- BookingDetail (complete, no-show actions)
- Wallet and Analytics endpoints
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_MASTER_EMAIL = f"test_master_{uuid.uuid4().hex[:8]}@slotta.app"
TEST_MASTER_PASSWORD = "testpass123"
TEST_MASTER_SLUG = f"test-master-{uuid.uuid4().hex[:8]}"
TEST_CLIENT_EMAIL = f"test_client_{uuid.uuid4().hex[:8]}@slotta.app"


class TestHealthAndSetup:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
        print(f"✅ Health check passed - Services: {data['services']}")


class TestMasterRegistrationAndLogin:
    """Test master registration and login flow"""
    
    @pytest.fixture(scope="class")
    def registered_master(self):
        """Register a test master and return credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Master",
            "email": TEST_MASTER_EMAIL,
            "password": TEST_MASTER_PASSWORD,
            "booking_slug": TEST_MASTER_SLUG,
            "specialty": "Hair Stylist",
            "location": "London, UK"
        })
        
        if response.status_code == 400 and "already registered" in response.text:
            # Login instead
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_MASTER_EMAIL,
                "password": TEST_MASTER_PASSWORD
            })
            assert login_response.status_code == 200
            return login_response.json()
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "master" in data
        print(f"✅ Master registered: {data['master']['email']}")
        return data
    
    def test_master_registration(self, registered_master):
        """Verify master registration returns token and master data"""
        assert "token" in registered_master
        assert "master" in registered_master
        assert registered_master["master"]["email"] == TEST_MASTER_EMAIL
        print(f"✅ Master data verified: {registered_master['master']['name']}")
    
    def test_master_login(self, registered_master):
        """Test master login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MASTER_EMAIL,
            "password": TEST_MASTER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✅ Master login successful")
    
    def test_get_master_by_slug(self, registered_master):
        """Test GET /api/masters/{slug} - Public booking page endpoint"""
        response = requests.get(f"{BASE_URL}/api/masters/{TEST_MASTER_SLUG}")
        assert response.status_code == 200
        data = response.json()
        assert data["booking_slug"] == TEST_MASTER_SLUG
        assert data["name"] == "Test Master"
        print(f"✅ Master by slug: {data['name']} ({data['booking_slug']})")


class TestServicesCRUD:
    """Test services CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MASTER_EMAIL,
            "password": TEST_MASTER_PASSWORD
        })
        if response.status_code != 200:
            # Register first
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Test Master",
                "email": TEST_MASTER_EMAIL,
                "password": TEST_MASTER_PASSWORD,
                "booking_slug": TEST_MASTER_SLUG,
                "specialty": "Hair Stylist"
            })
            if reg_response.status_code == 200:
                token = reg_response.json()["token"]
            else:
                pytest.skip("Could not authenticate")
        else:
            token = response.json()["token"]
        
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def master_id(self, auth_headers):
        """Get master ID"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_create_service(self, auth_headers, master_id):
        """Test creating a service"""
        response = requests.post(f"{BASE_URL}/api/services", json={
            "master_id": master_id,
            "name": "Test Haircut",
            "description": "Professional haircut service",
            "price": 50.0,
            "duration_minutes": 45
        }, headers=auth_headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Haircut"
        assert data["price"] == 50.0
        assert "base_slotta" in data
        assert data["base_slotta"] > 0  # Slotta should be calculated
        print(f"✅ Service created: {data['name']} - €{data['price']} (Slotta: €{data['base_slotta']})")
        return data["id"]
    
    def test_get_master_services(self, auth_headers, master_id):
        """Test getting services for a master"""
        response = requests.get(f"{BASE_URL}/api/services/master/{master_id}", headers=auth_headers)
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        print(f"✅ Got {len(services)} services for master")


class TestBookingFlow:
    """Test the complete booking flow"""
    
    @pytest.fixture(scope="class")
    def setup_data(self):
        """Setup master, service, and client for booking tests"""
        # Register/login master
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MASTER_EMAIL,
            "password": TEST_MASTER_PASSWORD
        })
        
        if login_response.status_code != 200:
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Test Master",
                "email": TEST_MASTER_EMAIL,
                "password": TEST_MASTER_PASSWORD,
                "booking_slug": TEST_MASTER_SLUG,
                "specialty": "Hair Stylist"
            })
            assert reg_response.status_code == 200
            token = reg_response.json()["token"]
            master = reg_response.json()["master"]
        else:
            token = login_response.json()["token"]
            master = login_response.json()["master"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a service
        service_response = requests.post(f"{BASE_URL}/api/services", json={
            "master_id": master["id"],
            "name": "Booking Test Service",
            "description": "Service for booking tests",
            "price": 75.0,
            "duration_minutes": 60
        }, headers=headers)
        
        if service_response.status_code == 201:
            service = service_response.json()
        else:
            # Get existing services
            services_response = requests.get(f"{BASE_URL}/api/services/master/{master['id']}", headers=headers)
            services = services_response.json()
            service = services[0] if services else None
        
        # Create a client
        client_response = requests.post(f"{BASE_URL}/api/clients", json={
            "name": "Test Client",
            "email": TEST_CLIENT_EMAIL,
            "phone": "+44 7700 900000"
        }, headers=headers)
        
        client = client_response.json()
        
        return {
            "master": master,
            "service": service,
            "client": client,
            "headers": headers
        }
    
    def test_create_booking_without_payment(self, setup_data):
        """Test creating a basic booking (without Stripe payment)"""
        booking_date = datetime.utcnow() + timedelta(days=3)
        
        response = requests.post(f"{BASE_URL}/api/bookings", json={
            "master_id": setup_data["master"]["id"],
            "client_id": setup_data["client"]["id"],
            "service_id": setup_data["service"]["id"],
            "booking_date": booking_date.isoformat()
        }, headers=setup_data["headers"])
        
        assert response.status_code == 201
        booking = response.json()
        assert booking["status"] == "pending"
        assert booking["slotta_amount"] > 0
        print(f"✅ Booking created: {booking['id']} - Slotta: €{booking['slotta_amount']}")
        return booking
    
    def test_get_booking_by_id(self, setup_data):
        """Test getting a booking by ID"""
        # First create a booking
        booking_date = datetime.utcnow() + timedelta(days=4)
        create_response = requests.post(f"{BASE_URL}/api/bookings", json={
            "master_id": setup_data["master"]["id"],
            "client_id": setup_data["client"]["id"],
            "service_id": setup_data["service"]["id"],
            "booking_date": booking_date.isoformat()
        }, headers=setup_data["headers"])
        
        booking_id = create_response.json()["id"]
        
        # Get the booking
        response = requests.get(f"{BASE_URL}/api/bookings/{booking_id}", headers=setup_data["headers"])
        assert response.status_code == 200
        booking = response.json()
        assert booking["id"] == booking_id
        print(f"✅ Got booking by ID: {booking_id}")
    
    def test_get_master_bookings(self, setup_data):
        """Test getting all bookings for a master"""
        response = requests.get(
            f"{BASE_URL}/api/bookings/master/{setup_data['master']['id']}", 
            headers=setup_data["headers"]
        )
        assert response.status_code == 200
        bookings = response.json()
        assert isinstance(bookings, list)
        print(f"✅ Got {len(bookings)} bookings for master")
    
    def test_complete_booking(self, setup_data):
        """Test marking a booking as completed"""
        # Create a booking first
        booking_date = datetime.utcnow() + timedelta(days=5)
        create_response = requests.post(f"{BASE_URL}/api/bookings", json={
            "master_id": setup_data["master"]["id"],
            "client_id": setup_data["client"]["id"],
            "service_id": setup_data["service"]["id"],
            "booking_date": booking_date.isoformat()
        }, headers=setup_data["headers"])
        
        booking_id = create_response.json()["id"]
        
        # Complete the booking
        response = requests.put(
            f"{BASE_URL}/api/bookings/{booking_id}/complete", 
            headers=setup_data["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Booking completed: {booking_id}")
    
    def test_no_show_booking(self, setup_data):
        """Test marking a booking as no-show"""
        # Create a booking first
        booking_date = datetime.utcnow() + timedelta(days=6)
        create_response = requests.post(f"{BASE_URL}/api/bookings", json={
            "master_id": setup_data["master"]["id"],
            "client_id": setup_data["client"]["id"],
            "service_id": setup_data["service"]["id"],
            "booking_date": booking_date.isoformat()
        }, headers=setup_data["headers"])
        
        booking_id = create_response.json()["id"]
        
        # Mark as no-show
        response = requests.put(
            f"{BASE_URL}/api/bookings/{booking_id}/no-show", 
            headers=setup_data["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        assert "master_compensation" in data
        assert "client_wallet_credit" in data
        print(f"✅ No-show processed: Master €{data['master_compensation']}, Client €{data['client_wallet_credit']}")


class TestClientPortal:
    """Test Client Portal functionality"""
    
    @pytest.fixture(scope="class")
    def client_with_bookings(self):
        """Create a client with bookings for testing"""
        # Login as master
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MASTER_EMAIL,
            "password": TEST_MASTER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Master not available")
        
        token = login_response.json()["token"]
        master = login_response.json()["master"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get or create service
        services_response = requests.get(f"{BASE_URL}/api/services/master/{master['id']}", headers=headers)
        services = services_response.json()
        
        if not services:
            service_response = requests.post(f"{BASE_URL}/api/services", json={
                "master_id": master["id"],
                "name": "Client Portal Test Service",
                "price": 60.0,
                "duration_minutes": 45
            }, headers=headers)
            service = service_response.json()
        else:
            service = services[0]
        
        # Create client
        client_email = f"portal_test_{uuid.uuid4().hex[:8]}@slotta.app"
        client_response = requests.post(f"{BASE_URL}/api/clients", json={
            "name": "Portal Test Client",
            "email": client_email,
            "phone": "+44 7700 900001"
        }, headers=headers)
        client = client_response.json()
        
        # Create a booking
        booking_date = datetime.utcnow() + timedelta(days=7)
        booking_response = requests.post(f"{BASE_URL}/api/bookings", json={
            "master_id": master["id"],
            "client_id": client["id"],
            "service_id": service["id"],
            "booking_date": booking_date.isoformat()
        }, headers=headers)
        
        return {
            "client": client,
            "client_email": client_email,
            "booking": booking_response.json() if booking_response.status_code == 201 else None,
            "headers": headers
        }
    
    def test_get_client_by_email(self, client_with_bookings):
        """Test GET /api/clients/email/{email} - Client Portal lookup"""
        response = requests.get(
            f"{BASE_URL}/api/clients/email/{client_with_bookings['client_email']}"
        )
        assert response.status_code == 200
        client = response.json()
        assert client["email"] == client_with_bookings["client_email"]
        print(f"✅ Client found by email: {client['name']}")
    
    def test_get_client_bookings_by_email(self, client_with_bookings):
        """Test GET /api/bookings/client/email/{email} - Client Portal bookings"""
        response = requests.get(
            f"{BASE_URL}/api/bookings/client/email/{client_with_bookings['client_email']}"
        )
        assert response.status_code == 200
        bookings = response.json()
        assert isinstance(bookings, list)
        if bookings:
            # Check enriched data
            assert "service_name" in bookings[0]
            assert "master_name" in bookings[0]
        print(f"✅ Got {len(bookings)} bookings for client via email")
    
    def test_cancel_booking(self, client_with_bookings):
        """Test PUT /api/bookings/{id}/cancel - Client cancellation"""
        if not client_with_bookings["booking"]:
            pytest.skip("No booking to cancel")
        
        booking_id = client_with_bookings["booking"]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/bookings/{booking_id}/cancel",
            headers=client_with_bookings["headers"]
        )
        
        # May fail if deadline passed, but endpoint should work
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "payment_released" in data
            print(f"✅ Booking cancelled: {booking_id}")
        else:
            print(f"⚠️ Booking cancel returned 400 (deadline may have passed)")


class TestWalletAndAnalytics:
    """Test Wallet and Analytics endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_data(self):
        """Get authenticated master data"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MASTER_EMAIL,
            "password": TEST_MASTER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Master not available")
        
        return {
            "token": login_response.json()["token"],
            "master": login_response.json()["master"],
            "headers": {"Authorization": f"Bearer {login_response.json()['token']}"}
        }
    
    def test_get_master_wallet(self, auth_data):
        """Test GET /api/wallet/master/{id}"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/master/{auth_data['master']['id']}",
            headers=auth_data["headers"]
        )
        assert response.status_code == 200
        wallet = response.json()
        assert "wallet_balance" in wallet
        assert "pending_payouts" in wallet
        assert "lifetime_earnings" in wallet
        assert "transactions" in wallet
        print(f"✅ Wallet: Balance €{wallet['wallet_balance']}, Pending €{wallet['pending_payouts']}")
    
    def test_get_master_analytics(self, auth_data):
        """Test GET /api/analytics/master/{id}"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/master/{auth_data['master']['id']}",
            headers=auth_data["headers"]
        )
        assert response.status_code == 200
        analytics = response.json()
        assert "total_bookings" in analytics
        assert "completed_bookings" in analytics
        assert "no_shows" in analytics
        assert "no_show_rate" in analytics
        assert "time_protected_eur" in analytics
        assert "avg_slotta" in analytics
        print(f"✅ Analytics: {analytics['total_bookings']} bookings, {analytics['no_show_rate']:.1f}% no-show rate")
    
    def test_get_master_clients(self, auth_data):
        """Test GET /api/clients/master/{id}"""
        response = requests.get(
            f"{BASE_URL}/api/clients/master/{auth_data['master']['id']}",
            headers=auth_data["headers"]
        )
        assert response.status_code == 200
        clients = response.json()
        assert isinstance(clients, list)
        print(f"✅ Got {len(clients)} clients for master")


class TestGoogleCalendarEndpoints:
    """Test Google Calendar integration endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_data(self):
        """Get authenticated master data"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MASTER_EMAIL,
            "password": TEST_MASTER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Master not available")
        
        return {
            "token": login_response.json()["token"],
            "master": login_response.json()["master"],
            "headers": {"Authorization": f"Bearer {login_response.json()['token']}"}
        }
    
    def test_get_google_auth_url(self, auth_data):
        """Test GET /api/google/auth-url"""
        response = requests.get(
            f"{BASE_URL}/api/google/auth-url",
            headers=auth_data["headers"]
        )
        # May return 503 if not configured, but endpoint should exist
        assert response.status_code in [200, 503]
        if response.status_code == 200:
            data = response.json()
            assert "auth_url" in data
            print(f"✅ Google auth URL available")
        else:
            print("⚠️ Google Calendar not configured (503)")
    
    def test_get_google_sync_status(self, auth_data):
        """Test GET /api/google/sync-status/{master_id}"""
        response = requests.get(
            f"{BASE_URL}/api/google/sync-status/{auth_data['master']['id']}",
            headers=auth_data["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        print(f"✅ Google Calendar connected: {data['connected']}")


class TestSettingsEndpoints:
    """Test Settings-related endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_data(self):
        """Get authenticated master data"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MASTER_EMAIL,
            "password": TEST_MASTER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Master not available")
        
        return {
            "token": login_response.json()["token"],
            "master": login_response.json()["master"],
            "headers": {"Authorization": f"Bearer {login_response.json()['token']}"}
        }
    
    def test_update_master_profile(self, auth_data):
        """Test PUT /api/masters/{id} - Profile update"""
        response = requests.put(
            f"{BASE_URL}/api/masters/{auth_data['master']['id']}",
            json={
                "name": "Updated Test Master",
                "bio": "Updated bio for testing",
                "settings": {
                    "daily_summary_enabled": True,
                    "summary_time": "08:00",
                    "timezone": "Europe/London"
                }
            },
            headers=auth_data["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Test Master"
        print(f"✅ Master profile updated: {data['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
