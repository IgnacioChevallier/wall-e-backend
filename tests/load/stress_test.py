"""
Wall-E Stress Testing Configuration
Designed to find breaking point (500-2000+ concurrent users)
"""

import os
from locust import HttpUser, task, between, TaskSet
from locustfile import WalletUser, DebinMassiveLoad

# Stress test configuration
STRESS_TEST_CONFIG = {
    'users': 1000,
    'spawn_rate': 50,
    'run_time': '15m',
    'host': os.getenv('API_HOST', 'http://localhost:3000')
}

class AggressiveUserBehavior(TaskSet):
    """Aggressive user behavior for stress testing"""
    
    def on_start(self):
        """Prepare user for aggressive testing"""
        self.user.add_money_to_wallet(5000)
    
    @task(10)
    def rapid_balance_checks(self):
        """Rapid balance checking"""
        self.user.get_balance()
    
    @task(8)
    def concurrent_transfers(self):
        """Make multiple concurrent transfers"""
        for _ in range(3):  # 3 transfers in quick succession
            if self.user.wallet_balance < 10:
                self.user.add_money_to_wallet(500)
                
            recipient_email = self.user.create_recipient_user()
            if recipient_email:
                amount = 5.0  # Small fixed amount for stress
                
                response = self.client.post("/transactions/p2p",
                    json={
                        "recipientIdentifier": recipient_email,
                        "amount": amount
                    },
                    headers=self.user.get_headers(),
                    catch_response=True
                )
                
                if response.status_code == 201:
                    self.user.wallet_balance -= amount
                    response.success()
                else:
                    response.failure(f"P2P transfer failed: {response.text}")
    
    @task(6)
    def rapid_debin_requests(self):
        """Rapid DEBIN requests"""
        amount = 100.0
        
        response = self.client.post("/wallet/topup/debin",
            json={"amount": amount},
            headers=self.user.get_headers(),
            catch_response=True
        )
        
        if response.status_code == 201:
            self.user.wallet_balance += amount
            response.success()
        else:
            response.failure(f"DEBIN request failed: {response.text}")
    
    @task(4)
    def transaction_history_spam(self):
        """Spam transaction history requests"""
        response = self.client.get("/transactions",
            headers=self.user.get_headers(),
            catch_response=True
        )
        
        if response.status_code == 200:
            response.success()
        else:
            response.failure(f"Get transactions failed: {response.text}")
    
    @task(2)
    def rapid_money_adding(self):
        """Rapid money adding"""
        amount = 50.0
        self.user.add_money_to_wallet(amount)


class StressTestUser(WalletUser):
    """Stress test user with aggressive behavior"""
    tasks = [AggressiveUserBehavior]
    weight = 8
    wait_time = between(0.1, 0.5)  # Very short wait times for stress


class StressTestDebinUser(WalletUser):
    """User focused on DEBIN stress testing"""
    tasks = [DebinMassiveLoad]
    weight = 2
    wait_time = between(0.1, 0.3)  # Minimal wait time


class DatabaseStressUser(WalletUser):
    """User designed to stress database operations"""
    weight = 1
    wait_time = between(0.1, 0.2)
    
    @task(5)
    def database_heavy_operations(self):
        """Database intensive operations"""
        # Multiple rapid balance checks
        for _ in range(5):
            self.get_balance()
        
        # Get transaction history multiple times
        for _ in range(3):
            response = self.client.get("/transactions",
                headers=self.get_headers(),
                catch_response=True
            )
            
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get transactions failed: {response.text}")


# Stress test breaking point thresholds
BREAKING_POINT_INDICATORS = {
    'max_avg_response_time': 5000,     # 5s average response time indicates stress
    'max_95th_percentile': 10000,      # 10s 95th percentile indicates severe stress
    'max_failure_rate': 0.10,          # 10% failure rate indicates breaking point
    'min_requests_per_second': 10,     # Below 10 RPS indicates system overwhelmed
    'max_cpu_threshold': 90,           # 90% CPU usage
    'max_memory_threshold': 85         # 85% memory usage
}

def detect_breaking_point(environment):
    """Detect if system has reached breaking point"""
    stats = environment.stats
    
    breaking_indicators = []
    
    # Check response times
    if stats.total.avg_response_time > BREAKING_POINT_INDICATORS['max_avg_response_time']:
        breaking_indicators.append(f"Average response time {stats.total.avg_response_time:.2f}ms indicates severe stress")
    
    # Check failure rate
    failure_rate = stats.total.num_failures / max(stats.total.num_requests, 1)
    if failure_rate > BREAKING_POINT_INDICATORS['max_failure_rate']:
        breaking_indicators.append(f"Failure rate {failure_rate:.2%} indicates breaking point")
    
    # Check throughput degradation
    if stats.total.current_rps < BREAKING_POINT_INDICATORS['min_requests_per_second']:
        breaking_indicators.append(f"Requests per second {stats.total.current_rps:.2f} indicates system overwhelmed")
    
    return breaking_indicators

def stress_test_analysis(environment):
    """Comprehensive stress test analysis"""
    stats = environment.stats
    
    analysis = {
        'peak_users_handled': environment.user_count,
        'requests_per_second': stats.total.current_rps,
        'average_response_time': stats.total.avg_response_time,
        'failure_rate': stats.total.num_failures / max(stats.total.num_requests, 1),
        'total_requests': stats.total.num_requests,
        'breaking_point_reached': len(detect_breaking_point(environment)) > 0
    }
    
    return analysis

if __name__ == "__main__":
    print("=== Wall-E Stress Test Configuration ===")
    print(f"Users: {STRESS_TEST_CONFIG['users']}")
    print(f"Spawn Rate: {STRESS_TEST_CONFIG['spawn_rate']}")
    print(f"Run Time: {STRESS_TEST_CONFIG['run_time']}")
    print(f"Host: {STRESS_TEST_CONFIG['host']}")
    print("\nBreaking Point Indicators:")
    for key, value in BREAKING_POINT_INDICATORS.items():
        print(f"  {key}: {value}")
    print("\nWarning: This test is designed to stress the system to its limits!")
    print("Monitor system resources closely during execution.") 