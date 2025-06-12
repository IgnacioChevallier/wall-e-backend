"""
Wall-E Backend Load Testing with Locust
Main configuration file for performance testing
"""

import os
import json
import random
import requests
from faker import Faker
from locust import HttpUser, TaskSet, task, between, events
from locust.env import Environment
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
fake = Faker()

# Constant user for external bank transfers
CONSTANT_BANK_USER = {
    "email": "bank_transfer_user@loadtest.com", 
    "password": "BankTransfer123!",
    "alias": "bank_transfer_user"
}

def create_constant_bank_user():
    """Create a constant user for external bank transfers"""
    try:
        host = os.getenv('API_HOST', 'http://localhost:3000')
        
        # Try to register the constant user
        response = requests.post(f"{host}/auth/register", json={
            "email": CONSTANT_BANK_USER["email"],
            "password": CONSTANT_BANK_USER["password"]
        })
        
        if response.status_code == 201:
            print(f"✅ Created constant bank user: {CONSTANT_BANK_USER['alias']}")
            return True
        elif response.status_code == 400 and "already exists" in response.text:
            print(f"✅ Constant bank user already exists: {CONSTANT_BANK_USER['alias']}")
            return True
        else:
            print(f"❌ Failed to create constant bank user: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating constant bank user: {e}")
        return False

class WalletUser(HttpUser):
    """Base user class for Wall-E wallet testing"""
    
    abstract = True  # Mark as abstract to prevent direct instantiation
    wait_time = between(1, 3)
    host = os.getenv('API_HOST', 'http://localhost:3000')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        self.user_data = None
        self.wallet_balance = 0
        self.user_email = None
        self.user_alias = None
    
    def on_start(self):
        """Setup method called when user starts"""
        self.register_user()
        if self.auth_token:
            self.login_user()
    
    def register_user(self):
        """Register a new user"""
        self.user_email = fake.email()
        password = "TestPassword123!"
        
        with self.client.post("/auth/register", json={
            "email": self.user_email,
            "password": password
        }, catch_response=True) as response:
            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"Registration failed: {response.text}")
            
    def login_user(self):
        """Login with the registered user"""
        with self.client.post("/auth/login", json={
            "email": self.user_email,
            "password": "TestPassword123!"
        }, catch_response=True) as response:
            if response.status_code == 200:
                # Extract auth token from cookies
                if 'access_token' in response.cookies:
                    self.auth_token = response.cookies['access_token']
                    response.success()
                else:
                    response.failure("No auth token in response cookies")
            else:
                response.failure(f"Login failed: {response.text}")
    
    def get_headers(self):
        """Get headers with authentication"""
        return {'Content-Type': 'application/json'}
    
    def get_cookies(self):
        """Get cookies with authentication"""
        if self.auth_token:
            return {'access_token': self.auth_token}
        return {}
    
    def get_balance(self):
        """Get current wallet balance"""
        if not self.auth_token:
            self.login_user()
            
        with self.client.get("/wallet/balance",
            headers=self.get_headers(),
            cookies=self.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.wallet_balance = data.get('balance', 0)
                response.success()
                return self.wallet_balance
            else:
                response.failure(f"Get balance failed: {response.text}")
                return 0

    def create_recipient_user(self):
        """Create a recipient user for P2P transfers"""
        recipient_email = fake.email()
        password = "TestPassword123!"
        
        # Register recipient
        response = self.client.post("/auth/register", json={
            "email": recipient_email,
            "password": password
        })
        
        if response.status_code == 201:
            return recipient_email
        return None


class NewUserJourney(TaskSet):
    """Tasks for new user journey: register → login → check balance"""
    
    @task(5)
    def check_balance(self):
        """Check wallet balance"""
        self.user.get_balance()
    
    @task(1)
    def get_transactions(self):
        """Get transaction history"""
        if not self.user.auth_token:
            self.user.login_user()
            
        with self.client.get("/transactions",
            headers=self.user.get_headers(),
            cookies=self.user.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get transactions failed: {response.text}")


class ExistingUserJourney(TaskSet):
    """Tasks for existing user: login → check balance → check history"""
    
    @task(4)
    def check_balance(self):
        """Check wallet balance"""
        self.user.get_balance()
    
    @task(1)
    def get_transactions(self):
        """Get transaction history"""
        if not self.user.auth_token:
            self.user.login_user()
            
        with self.client.get("/transactions",
            headers=self.user.get_headers(),
            cookies=self.user.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get transactions failed: {response.text}")


class FrequentUserJourney(TaskSet):
    """Tasks for frequent user: balance checks and DEBIN requests"""
    
    @task(5)
    def check_balance(self):
        """Check wallet balance frequently"""
        self.user.get_balance()
    
    @task(2)
    def get_transactions(self):
        """Get transaction history"""
        if not self.user.auth_token:
            self.user.login_user()
            
        with self.client.get("/transactions",
            headers=self.user.get_headers(),
            cookies=self.user.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get transactions failed: {response.text}")
    
    @task(1)
    def request_debin(self):
        """Request DEBIN"""
        if not self.user.auth_token:
            self.user.login_user()
            
        amount = random.uniform(50, 200)
        
        with self.client.post("/wallet/topup/debin",
            json={"amount": amount},
            headers=self.user.get_headers(),
            cookies=self.user.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 201:
                # Get updated balance after successful DEBIN
                self.user.get_balance()
                response.success()
            else:
                response.failure(f"DEBIN request failed: {response.text}")


class DebinMassiveLoad(TaskSet):
    """Massive DEBIN requests for stress testing"""
    
    @task(1)
    def massive_debin_requests(self):
        """Make massive DEBIN requests"""
        if not self.user.auth_token:
            self.user.login_user()
            
        amount = random.uniform(50, 200)
        
        with self.client.post("/wallet/topup/debin",
            json={"amount": amount},
            headers=self.user.get_headers(),
            cookies=self.user.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 201:
                # Get updated balance after successful DEBIN
                self.user.get_balance()
                response.success()
            else:
                response.failure(f"DEBIN request failed: {response.text}")


class ExternalBankTransferLoad(TaskSet):
    """External bank transfer testing using eva-bank service"""
    
    @task(3)
    def external_bank_transfer(self):
        """Simulate external bank transfer via eva-bank service"""
        amount = random.uniform(50, 500)
        
        # Call eva-bank transfer endpoint which will call back to walle-app
        with self.client.post("/api/transfer",
            json={
                "amount": amount,
                "alias": CONSTANT_BANK_USER["alias"],  # Use constant user alias
                "source": f"external_bank_{random.randint(1000, 9999)}"
            },
            base_url="http://eva-bank:3001",  # Call eva-bank directly
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"External bank transfer failed: {response.text}")

# User classes for different scenarios
class NewUser(WalletUser):
    tasks = [NewUserJourney]
    weight = 3


class ExistingUser(WalletUser):
    tasks = [ExistingUserJourney]
    weight = 5


class FrequentUser(WalletUser):
    tasks = [FrequentUserJourney]
    weight = 2


class DebinUser(WalletUser):
    tasks = [DebinMassiveLoad]
    weight = 1


class ExternalBankUser(WalletUser):
    """User focused on external bank transfer testing"""
    tasks = [ExternalBankTransferLoad]
    weight = 2
    wait_time = between(2, 5)  # Slower pace for external operations


# Event handlers for custom metrics
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, context, **kwargs):
    """Custom request handler for additional metrics"""
    if exception:
        print(f"Request failed: {name} - {exception}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Handler for test start"""
    print("=== Wall-E Load Test Started ===")
    print(f"Host: {environment.host}")
    print(f"Users: {getattr(environment, 'user_count', 'N/A')}")
    
    # Create constant bank user for external transfers
    print("🏦 Setting up constant bank user...")
    create_constant_bank_user()


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Handler for test stop"""
    print("=== Wall-E Load Test Finished ===")
    
    # Print summary statistics
    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"Requests per second: {stats.total.current_rps:.2f}") 