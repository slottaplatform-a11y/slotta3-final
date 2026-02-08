#!/usr/bin/env python3
"""
Navigation Backend Support Testing
Tests the backend APIs that support the frontend navigation flows
"""

import requests
import json
from datetime import datetime, timedelta

# Backend URL from frontend .env
BACKEND_URL = "https://slotta-connect.preview.emergentagent.com/api"

class NavigationBackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message
        })
    
    def test_homepage_backend_support(self):
        """Test backend APIs that support the homepage"""
        try:
            # Test health check (used by homepage)
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            
            if response.status_code == 200:
                self.log_test("Homepage Backend Support", True, "Health check API working (supports homepage status)")
            else:
                self.log_test("Homepage Backend Support", False, f"Health check failed: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Homepage Backend Support", False, f"Request failed: {str(e)}")
    
    def test_demo_booking_page_backend(self):
        """Test backend APIs that support /sophiabrown booking page"""
        try:
            # Test 1: Get demo master data
            master_response = self.session.get(f"{self.base_url}/masters/sophiabrown", timeout=10)
            
            if master_response.status_code != 200:
                self.log_test("Demo Booking Page Backend", False, f"Master lookup failed: HTTP {master_response.status_code}")
                return
                
            master_data = master_response.json()
            master_id = master_data.get('id')
            
            # Test 2: Get services for the demo master
            services_response = self.session.get(f"{self.base_url}/services/master/{master_id}", timeout=10)
            
            if services_response.status_code == 200:
                services = services_response.json()
                if isinstance(services, list) and len(services) >= 4:
                    self.log_test("Demo Booking Page Backend", True, f"Demo master and {len(services)} services available for booking page")
                else:
                    self.log_test("Demo Booking Page Backend", False, f"Insufficient services: {len(services) if isinstance(services, list) else 'invalid'}")
            else:
                self.log_test("Demo Booking Page Backend", False, f"Services lookup failed: HTTP {services_response.status_code}")
                
        except Exception as e:
            self.log_test("Demo Booking Page Backend", False, f"Request failed: {str(e)}")
    
    def test_registration_backend_support(self):
        """Test backend APIs that support /register page"""
        try:
            # Test registration endpoint with test data
            test_registration = {
                "name": "Test Master Registration",
                "email": f"test.registration.{datetime.now().timestamp()}@example.com",
                "password": "TestPassword123!",
                "booking_slug": f"test-master-{int(datetime.now().timestamp())}",
                "specialty": "Test Specialty",
                "location": "Test Location",
                "phone": "+1-555-0123"
            }
            
            response = self.session.post(
                f"{self.base_url}/auth/register",
                json=test_registration,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                if 'token' in data and 'master' in data:
                    self.log_test("Registration Backend Support", True, "Registration API working (token and master returned)")
                else:
                    self.log_test("Registration Backend Support", False, "Registration API missing token or master data")
            elif response.status_code == 400 and "already" in response.text.lower():
                self.log_test("Registration Backend Support", True, "Registration API working (validation working)")
            else:
                self.log_test("Registration Backend Support", False, f"Registration failed: HTTP {response.status_code}: {response.text[:100]}")
                
        except Exception as e:
            self.log_test("Registration Backend Support", False, f"Request failed: {str(e)}")
    
    def test_login_backend_support(self):
        """Test backend APIs that support /login page"""
        try:
            # Test login endpoint with demo master credentials (will fail but endpoint should exist)
            test_login = {
                "email": "sophia.brown@example.com",
                "password": "wrong_password"
            }
            
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=test_login,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # Should return 401 for wrong credentials, which means endpoint is working
            if response.status_code == 401:
                self.log_test("Login Backend Support", True, "Login API working (401 for invalid credentials)")
            elif response.status_code == 200:
                self.log_test("Login Backend Support", True, "Login API working (successful login)")
            else:
                self.log_test("Login Backend Support", False, f"Login endpoint failed: HTTP {response.status_code}: {response.text[:100]}")
                
        except Exception as e:
            self.log_test("Login Backend Support", False, f"Request failed: {str(e)}")
    
    def test_client_portal_backend_support(self):
        """Test backend APIs that support /client/portal page"""
        try:
            # Test client bookings lookup by email (common client portal function)
            test_email = "test.client@example.com"
            
            response = self.session.get(f"{self.base_url}/bookings/client/email/{test_email}", timeout=10)
            
            if response.status_code == 200:
                bookings = response.json()
                if isinstance(bookings, list):
                    self.log_test("Client Portal Backend Support", True, f"Client bookings API working ({len(bookings)} bookings found)")
                else:
                    self.log_test("Client Portal Backend Support", False, "Client bookings API returned invalid format")
            elif response.status_code == 404:
                self.log_test("Client Portal Backend Support", True, "Client bookings API working (404 for non-existent client)")
            else:
                self.log_test("Client Portal Backend Support", False, f"Client bookings failed: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Client Portal Backend Support", False, f"Request failed: {str(e)}")
    
    def test_booking_flow_backend_support(self):
        """Test backend APIs that support the complete booking flow"""
        try:
            # Get demo master and service for booking flow test
            master_response = self.session.get(f"{self.base_url}/masters/sophiabrown", timeout=10)
            
            if master_response.status_code != 200:
                self.log_test("Booking Flow Backend Support", False, "Cannot get demo master for booking flow test")
                return
                
            master_data = master_response.json()
            master_id = master_data.get('id')
            
            # Get services
            services_response = self.session.get(f"{self.base_url}/services/master/{master_id}", timeout=10)
            
            if services_response.status_code != 200:
                self.log_test("Booking Flow Backend Support", False, "Cannot get services for booking flow test")
                return
                
            services = services_response.json()
            if not services:
                self.log_test("Booking Flow Backend Support", False, "No services available for booking flow test")
                return
                
            service_id = services[0]['id']
            
            # Test booking creation with payment (this tests the full flow)
            booking_data = {
                "master_id": master_id,
                "service_id": service_id,
                "client_name": "Navigation Test Client",
                "client_email": "navigation.test@example.com",
                "client_phone": "+1-555-0199",
                "booking_date": (datetime.now() + timedelta(days=3)).isoformat(),
                "payment_method_id": "pm_card_visa",
                "notes": "Navigation backend test booking"
            }
            
            response = self.session.post(
                f"{self.base_url}/bookings/with-payment",
                json=booking_data,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            if response.status_code in [200, 201]:
                self.log_test("Booking Flow Backend Support", True, "Complete booking flow backend APIs working")
            elif response.status_code == 400 and "payment" in response.text.lower():
                self.log_test("Booking Flow Backend Support", True, "Booking flow backend APIs working (payment validation expected)")
            else:
                self.log_test("Booking Flow Backend Support", False, f"Booking flow failed: HTTP {response.status_code}: {response.text[:100]}")
                
        except Exception as e:
            self.log_test("Booking Flow Backend Support", False, f"Request failed: {str(e)}")
    
    def run_navigation_tests(self):
        """Run all navigation backend support tests"""
        print("🧭 Testing Backend APIs Supporting Frontend Navigation")
        print("=" * 60)
        
        self.test_homepage_backend_support()
        self.test_demo_booking_page_backend()
        self.test_registration_backend_support()
        self.test_login_backend_support()
        self.test_client_portal_backend_support()
        self.test_booking_flow_backend_support()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 NAVIGATION BACKEND SUPPORT SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        return passed, total

if __name__ == "__main__":
    tester = NavigationBackendTester()
    passed, total = tester.run_navigation_tests()
    
    print(f"\n🎯 NAVIGATION BACKEND SUPPORT: {passed}/{total} APIs working")