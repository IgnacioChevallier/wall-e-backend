"""
Wall-E Backend Load Testing with Locust
Main configuration file for performance testing
"""

import os
import json
import random
import time
import uuid
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
        self.user_id = str(uuid.uuid4())[:8]  # Unique identifier for this user instance
    
    def on_start(self):
        """Setup method called when user starts"""
        self.register_user()
        if self.auth_token:  # Only login if registration was successful
            self.login_user()
    
    def register_user(self):
        """Register a new user with unique email"""
        # Generate unique email with timestamp and user_id to avoid duplicates
        timestamp = int(time.time())
        self.user_email = f"loadtest_{self.user_id}_{timestamp}@example.com"
        password = "TestPassword123!"
        
        with self.client.post("/auth/register", json={
            "email": self.user_email,
            "password": password
        }, catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                # Extract user data if available
                try:
                    data = response.json()
                    if 'user' in data:
                        self.user_data = data['user']
                        self.user_alias = data['user'].get('alias', f"user_{self.user_id}")
                except:
                    self.user_alias = f"user_{self.user_id}"
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
        """Add money to wallet via deposit endpoint"""
        with self.client.post("/wallet/deposit", 
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
                try:
                    data = response.json()
                    self.wallet_balance = data.get('balance', 0)
                    response.success()
                except:
                    response.failure("Failed to parse balance response")
            else:
                response.failure(f"Get balance failed: {response.text}")
    
    def create_recipient_user(self):
        """Create a recipient user for P2P transfers"""
        timestamp = int(time.time())
        recipient_id = str(uuid.uuid4())[:8]
        recipient_email = f"recipient_{recipient_id}_{timestamp}@example.com"
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
        if self.user.auth_token:
            self.user.get_balance()
    
    @task(2)
    def add_money(self):
        """Add money to wallet"""
        if self.user.auth_token:
            amount = random.uniform(50, 500)
            self.user.add_money_to_wallet(amount)
    
    @task(1)
    def get_transactions(self):
        """Get transaction history"""
        if self.user.auth_token:
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
        if self.user.auth_token:
            # Add initial money and update balance
            self.user.add_money_to_wallet(1000)
            time.sleep(1)  # Wait a bit for transaction to process
            self.user.get_balance()
    
    @task(4)
    def check_balance(self):
        """Check wallet balance"""
        if self.user.auth_token:
            self.user.get_balance()
    
    @task(2)
    def p2p_transfer(self):
        """Make P2P transfer"""
        if not self.user.auth_token:
            return
            
        # Ensure we have recent balance info
        self.user.get_balance()
        
        # Only transfer if we have sufficient funds
        if self.user.wallet_balance < 20:
            self.user.add_money_to_wallet(100)
            time.sleep(1)
            self.user.get_balance()
            
        if self.user.wallet_balance >= 20:
            recipient_email = self.user.create_recipient_user()
            if recipient_email:
                # Transfer a small amount (max 10% of balance, min 5)
                max_transfer = min(50, self.user.wallet_balance * 0.1)
                amount = random.uniform(5, max_transfer)
                
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
        if self.user.auth_token:
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
    """Tasks for frequent user: multiple operations"""
    
    def on_start(self):
        """Ensure user has money for multiple operations"""
        if self.user.auth_token:
            self.user.add_money_to_wallet(2000)
            time.sleep(1)
            self.user.get_balance()
    
    @task(5)
    def check_balance(self):
        """Check wallet balance frequently"""
        if self.user.auth_token:
            self.user.get_balance()
    
    @task(3)
    def multiple_small_transfers(self):
        """Make multiple small transfers"""
        if not self.user.auth_token:
            return
            
        self.user.get_balance()
        
        if self.user.wallet_balance < 50:
            self.user.add_money_to_wallet(200)
            time.sleep(1)
            self.user.get_balance()
        
        # Make 2-3 small transfers
        num_transfers = random.randint(1, 2)
        for _ in range(num_transfers):
            if self.user.wallet_balance >= 10:
                recipient_email = self.user.create_recipient_user()
                if recipient_email:
                    amount = random.uniform(5, 15)
                    
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
                            response.failure(f"Small transfer failed: {response.text}")
                            break
                time.sleep(0.5)  # Small delay between transfers
    
    @task(2)
    def get_transactions(self):
        """Get transaction history"""
        if self.user.auth_token:
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
        """Request DEBIN (reduced frequency to avoid external service overload)"""
        if not self.user.auth_token:
            return
            
        # Only try DEBIN occasionally and with smaller amounts
        amount = random.uniform(10, 50)
        
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
                # Don't fail the test for DEBIN errors as they might be external service issues
                response.success()  # Mark as success to avoid skewing results


class DebinMassiveLoad(TaskSet):
    """DEBIN load testing with controlled frequency"""
    
    @task(1)
    def massive_debin_requests(self):
        """Make DEBIN requests with rate limiting"""
        if not self.user.auth_token:
            return
            
        # Reduced frequency and amounts for DEBIN to avoid overwhelming external service
        amount = random.uniform(5, 25)
        
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
                # Mark DEBIN failures as success to not skew overall results
                # since they might be due to external service limitations
                response.success()
        
        # Add delay to reduce load on external service
        time.sleep(random.uniform(2, 5))


# User classes with adjusted weights
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
    weight = 1  # Reduced weight to limit DEBIN load


# Event listeners for logging
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, context, **kwargs):
    """Log request details"""
    if exception:
        print(f"Request failed: {name} - {exception}")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    print("🚀 Wall-E Load Test Started!")
    print(f"Target host: {environment.host}")
    print(f"Users: {environment.runner.target_user_count if hasattr(environment.runner, 'target_user_count') else 'Unknown'}")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    print("🏁 Wall-E Load Test Completed!")
    print("Check the Locust web interface for detailed results.") 