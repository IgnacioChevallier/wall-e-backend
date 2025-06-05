"""
Wall-E Backend Load Testing with Locust
Main configuration file for performance testing
"""

import os
import json
import random
from faker import Faker
from locust import HttpUser, TaskSet, task, between, events
from locust.env import Environment
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
fake = Faker()

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
    
    def add_money_to_wallet(self, amount=100):
        """Add money to wallet via manual topup"""
        with self.client.post("/wallet/topup/manual", 
            json={
                "amount": amount,
                "method": "BANK_ACCOUNT",
                "sourceIdentifier": f"BANK_{fake.random_number(digits=8)}"
            },
            headers=self.get_headers(),
            cookies=self.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 201:
                self.wallet_balance += amount
                response.success()
            else:
                response.failure(f"Add money failed: {response.text}")
    
    def get_balance(self):
        """Get current wallet balance"""
        with self.client.get("/wallet/balance",
            headers=self.get_headers(),
            cookies=self.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.wallet_balance = data.get('balance', 0)
                response.success()
            else:
                response.failure(f"Get balance failed: {response.text}")
    
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
    """Tasks for new user journey: register → login → check balance → add money"""
    
    @task(3)
    def check_balance(self):
        """Check wallet balance"""
        self.user.get_balance()
    
    @task(2)
    def add_money(self):
        """Add money to wallet"""
        amount = random.uniform(50, 500)
        self.user.add_money_to_wallet(amount)
    
    @task(1)
    def get_transactions(self):
        """Get transaction history"""
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
    """Tasks for existing user: login → transfer → check history"""
    
    def on_start(self):
        """Ensure user has money for transfers"""
        self.user.add_money_to_wallet(1000)
    
    @task(4)
    def check_balance(self):
        """Check wallet balance"""
        self.user.get_balance()
    
    @task(2)
    def p2p_transfer(self):
        """Make P2P transfer"""
        if self.user.wallet_balance < 10:
            self.user.add_money_to_wallet(100)
            
        recipient_email = self.user.create_recipient_user()
        if recipient_email:
            amount = random.uniform(5, min(50, self.user.wallet_balance * 0.1))
            
            with self.client.post("/transactions/p2p",
                json={
                    "recipientIdentifier": recipient_email,
                    "amount": amount
                },
                headers=self.user.get_headers(),
                cookies=self.user.get_cookies(),
                catch_response=True
            ) as response:
                if response.status_code == 201:
                    self.user.wallet_balance -= amount
                    response.success()
                else:
                    response.failure(f"P2P transfer failed: {response.text}")
    
    @task(1)
    def get_transactions(self):
        """Get transaction history"""
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
    """Tasks for frequent user: multiple transfers and queries"""
    
    def on_start(self):
        """Ensure user has money for multiple transfers"""
        self.user.add_money_to_wallet(2000)
    
    @task(5)
    def check_balance(self):
        """Check wallet balance frequently"""
        self.user.get_balance()
    
    @task(3)
    def multiple_small_transfers(self):
        """Make multiple small transfers"""
        for _ in range(random.randint(1, 3)):
            if self.user.wallet_balance < 5:
                self.user.add_money_to_wallet(100)
                
            recipient_email = self.user.create_recipient_user()
            if recipient_email:
                amount = random.uniform(1, 10)
                
                with self.client.post("/transactions/p2p",
                    json={
                        "recipientIdentifier": recipient_email,
                        "amount": amount
                    },
                    headers=self.user.get_headers(),
                    cookies=self.user.get_cookies(),
                    catch_response=True
                ) as response:
                    if response.status_code == 201:
                        self.user.wallet_balance -= amount
                        response.success()
                    else:
                        response.failure(f"P2P transfer failed: {response.text}")
    
    @task(2)
    def get_transactions(self):
        """Get transaction history"""
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
        amount = random.uniform(100, 1000)
        
        with self.client.post("/wallet/topup/debin",
            json={"amount": amount},
            headers=self.user.get_headers(),
            cookies=self.user.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 201:
                self.user.wallet_balance += amount
                response.success()
            else:
                response.failure(f"DEBIN request failed: {response.text}")


class DebinMassiveLoad(TaskSet):
    """Massive DEBIN requests for stress testing"""
    
    @task(1)
    def massive_debin_requests(self):
        """Make massive DEBIN requests"""
        amount = random.uniform(50, 500)
        
        with self.client.post("/wallet/topup/debin",
            json={"amount": amount},
            headers=self.user.get_headers(),
            cookies=self.user.get_cookies(),
            catch_response=True
        ) as response:
            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"DEBIN request failed: {response.text}")


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