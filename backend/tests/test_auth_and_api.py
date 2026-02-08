"""
Backend API Tests for Slotta - Booking Platform
Tests: Auth (register, login, me), Services CRUD, Bookings, Clients, Wallet, Analytics, Calendar
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data with unique identifiers
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@slotta.app"
TEST_PASSWORD = "test123456"
TEST_NAME = "Test Master"
TEST_SLUG = f"testmaster{uuid.uuid4().hex[:8]}"


class TestHealthCheck:
    """Health check endpoint tests - run first"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
        print(f"✅ Health check passed: {data}")


class TestAuthRegistration:
    """Authentication registration tests"""
    
    def test_register_new_master(self):
        """Test POST /api/auth/register creates user and returns JWT"""
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME,
            "booking_slug": TEST_SLUG
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify token is returned
        assert "token" in data, "Token not returned"
        assert len(data["token"]) > 0, "Token is empty"
        
        # Verify master data is returned
        assert "master" in data, "Master data not returned"
        assert data["master"]["email"] == TEST_EMAIL
        assert data["master"]["name"] == TEST_NAME
        assert data["master"]["booking_slug"] == TEST_SLUG
        assert "id" in data["master"]
        
        # Verify password_hash is NOT returned
        assert "password_hash" not in data["master"], "password_hash should not be exposed"
        
        print(f"✅ Registration successful: {data['master']['email']}")
        
        # Store for other tests
        pytest.test_token = data["token"]
        pytest.test_master_id = data["master"]["id"]
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email fails"""
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Another Master",
            "booking_slug": f"another{uuid.uuid4().hex[:8]}"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 400, "Should fail with duplicate email"
        data = response.json()
        assert "already registered" in data.get("detail", "").lower() or "email" in data.get("detail", "").lower()
        print(f"✅ Duplicate email correctly rejected")
    
    def test_register_duplicate_slug(self):
        """Test registration with duplicate booking_slug fails"""
        payload = {
            "email": f"unique_{uuid.uuid4().hex[:8]}@slotta.app",
            "password": TEST_PASSWORD,
            "name": "Another Master",
            "booking_slug": TEST_SLUG  # Same slug as first registration
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 400, "Should fail with duplicate slug"
        data = response.json()
        assert "slug" in data.get("detail", "").lower() or "taken" in data.get("detail", "").lower()
        print(f"✅ Duplicate slug correctly rejected")


class TestAuthLogin:
    """Authentication login tests"""
    
    def test_login_success(self):
        """Test POST /api/auth/login with valid credentials"""
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify token is returned
        assert "token" in data, "Token not returned"
        assert len(data["token"]) > 0, "Token is empty"
        
        # Verify master data is returned
        assert "master" in data, "Master data not returned"
        assert data["master"]["email"] == TEST_EMAIL
        
        # Verify password_hash is NOT returned
        assert "password_hash" not in data["master"], "password_hash should not be exposed"
        
        print(f"✅ Login successful: {data['master']['email']}")
        
        # Store token for authenticated tests
        pytest.test_token = data["token"]
        pytest.test_master_id = data["master"]["id"]
    
    def test_login_invalid_email(self):
        """Test login with non-existent email"""
        payload = {
            "email": "nonexistent@slotta.app",
            "password": TEST_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 401, "Should fail with invalid email"
        print(f"✅ Invalid email correctly rejected")
    
    def test_login_invalid_password(self):
        """Test login with wrong password"""
        payload = {
            "email": TEST_EMAIL,
            "password": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 401, "Should fail with wrong password"
        print(f"✅ Invalid password correctly rejected")


class TestAuthMe:
    """Test /api/auth/me endpoint"""
    
    def test_get_current_user_authenticated(self):
        """Test GET /api/auth/me with valid token"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        
        assert data["email"] == TEST_EMAIL
        assert data["name"] == TEST_NAME
        assert "password_hash" not in data
        
        print(f"✅ Auth/me returned correct user: {data['email']}")
    
    def test_get_current_user_no_token(self):
        """Test GET /api/auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, "Should fail without token"
        print(f"✅ Unauthenticated request correctly rejected")
    
    def test_get_current_user_invalid_token(self):
        """Test GET /api/auth/me with invalid token"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 401, "Should fail with invalid token"
        print(f"✅ Invalid token correctly rejected")


class TestServicesAPI:
    """Services CRUD tests"""
    
    def test_create_service(self):
        """Test POST /api/services creates a service"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        payload = {
            "master_id": pytest.test_master_id,
            "name": "TEST_Haircut Service",
            "duration_minutes": 60,
            "price": 100.0,
            "description": "Test haircut service"
        }
        response = requests.post(f"{BASE_URL}/api/services", json=payload, headers=headers)
        
        assert response.status_code == 201, f"Create service failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Haircut Service"
        assert data["price"] == 100.0
        assert data["duration_minutes"] == 60
        assert "base_slotta" in data
        assert data["base_slotta"] > 0, "Slotta should be calculated"
        
        pytest.test_service_id = data["id"]
        print(f"✅ Service created: {data['name']} with Slotta €{data['base_slotta']}")
    
    def test_get_services_by_master(self):
        """Test GET /api/services/master/{master_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.get(
            f"{BASE_URL}/api/services/master/{pytest.test_master_id}",
            params={"active_only": False},
            headers=headers
        )
        
        assert response.status_code == 200, f"Get services failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        # Should have at least the service we created
        service_names = [s["name"] for s in data]
        assert "TEST_Haircut Service" in service_names
        
        print(f"✅ Retrieved {len(data)} services for master")
    
    def test_update_service(self):
        """Test PUT /api/services/{service_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        payload = {
            "master_id": pytest.test_master_id,
            "name": "TEST_Updated Haircut",
            "duration_minutes": 90,
            "price": 150.0
        }
        response = requests.put(
            f"{BASE_URL}/api/services/{pytest.test_service_id}",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200, f"Update service failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Updated Haircut"
        assert data["price"] == 150.0
        assert data["duration_minutes"] == 90
        
        print(f"✅ Service updated: {data['name']}")
    
    def test_delete_service(self):
        """Test DELETE /api/services/{service_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/services/{pytest.test_service_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Delete service failed: {response.text}"
        data = response.json()
        assert "deleted" in data.get("message", "").lower()
        
        print(f"✅ Service deleted successfully")


class TestAnalyticsAPI:
    """Analytics endpoint tests"""
    
    def test_get_master_analytics(self):
        """Test GET /api/analytics/master/{master_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analytics/master/{pytest.test_master_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get analytics failed: {response.text}"
        data = response.json()
        
        # Verify analytics structure
        assert "total_bookings" in data
        assert "completed_bookings" in data
        assert "no_shows" in data
        assert "no_show_rate" in data
        assert "time_protected_eur" in data
        assert "wallet_balance" in data
        
        print(f"✅ Analytics retrieved: {data}")


class TestWalletAPI:
    """Wallet endpoint tests"""
    
    def test_get_master_wallet(self):
        """Test GET /api/wallet/master/{master_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.get(
            f"{BASE_URL}/api/wallet/master/{pytest.test_master_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        data = response.json()
        
        # Verify wallet structure
        assert "wallet_balance" in data
        assert "pending_payouts" in data
        assert "lifetime_earnings" in data
        assert "transactions" in data
        assert isinstance(data["transactions"], list)
        
        print(f"✅ Wallet retrieved: balance €{data['wallet_balance']}")


class TestClientsAPI:
    """Clients endpoint tests"""
    
    def test_get_master_clients(self):
        """Test GET /api/clients/master/{master_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.get(
            f"{BASE_URL}/api/clients/master/{pytest.test_master_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} clients for master")


class TestBookingsAPI:
    """Bookings endpoint tests"""
    
    def test_get_master_bookings(self):
        """Test GET /api/bookings/master/{master_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.get(
            f"{BASE_URL}/api/bookings/master/{pytest.test_master_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get bookings failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} bookings for master")


class TestCalendarBlocksAPI:
    """Calendar blocks endpoint tests"""
    
    def test_create_calendar_block(self):
        """Test POST /api/calendar/blocks"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.post(
            f"{BASE_URL}/api/calendar/blocks",
            params={
                "master_id": pytest.test_master_id,
                "start_datetime": "2026-02-01T10:00:00",
                "end_datetime": "2026-02-01T12:00:00",
                "reason": "Test block"
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Create block failed: {response.text}"
        data = response.json()
        
        assert "block_id" in data
        pytest.test_block_id = data["block_id"]
        print(f"✅ Calendar block created: {data['block_id']}")
    
    def test_get_calendar_blocks(self):
        """Test GET /api/calendar/blocks/master/{master_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.get(
            f"{BASE_URL}/api/calendar/blocks/master/{pytest.test_master_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get blocks failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} calendar blocks")
    
    def test_delete_calendar_block(self):
        """Test DELETE /api/calendar/blocks/{block_id}"""
        if not hasattr(pytest, 'test_block_id'):
            pytest.skip("No block to delete")
        
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/calendar/blocks/{pytest.test_block_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Delete block failed: {response.text}"
        print(f"✅ Calendar block deleted")


class TestMasterUpdateAPI:
    """Master profile update tests"""
    
    def test_update_master_profile(self):
        """Test PUT /api/masters/{master_id}"""
        headers = {"Authorization": f"Bearer {pytest.test_token}"}
        payload = {
            "specialty": "Hair Stylist",
            "bio": "Test bio for master profile",
            "location": "Test City"
        }
        response = requests.put(
            f"{BASE_URL}/api/masters/{pytest.test_master_id}",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200, f"Update master failed: {response.text}"
        data = response.json()
        
        assert data["specialty"] == "Hair Stylist"
        assert data["bio"] == "Test bio for master profile"
        assert data["location"] == "Test City"
        
        print(f"✅ Master profile updated successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
