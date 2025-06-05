"""
Wall-E Load Testing Configuration
Simulates normal usage patterns (50-200 concurrent users)
"""

import os
from locust import HttpUser, task, between
from locustfile import WalletUser, NewUserJourney, ExistingUserJourney, FrequentUserJourney

# Load test configuration
LOAD_TEST_CONFIG = {
    'users': 100,
    'spawn_rate': 10,
    'run_time': '10m',
    'host': os.getenv('API_HOST', 'http://localhost:3000')
}

class LoadTestNewUser(WalletUser):
    """New user for load testing - lighter workload"""
    tasks = [NewUserJourney]
    weight = 4
    wait_time = between(2, 5)  # More realistic wait times

class LoadTestExistingUser(WalletUser):
    """Existing user for load testing - moderate workload"""
    tasks = [ExistingUserJourney]
    weight = 5
    wait_time = between(1, 4)

class LoadTestFrequentUser(WalletUser):
    """Frequent user for load testing - higher activity"""
    tasks = [FrequentUserJourney]
    weight = 1
    wait_time = between(1, 3)

# Performance thresholds for load testing
PERFORMANCE_THRESHOLDS = {
    'max_avg_response_time': 500,  # 500ms max average response time
    'max_95th_percentile': 1000,   # 1s max 95th percentile
    'max_failure_rate': 0.01,      # 1% max failure rate
    'min_requests_per_second': 50  # Minimum 50 RPS
}

def validate_performance_thresholds(environment):
    """Validate that performance meets load test requirements"""
    stats = environment.stats
    
    failures = []
    
    # Check average response time
    if stats.total.avg_response_time > PERFORMANCE_THRESHOLDS['max_avg_response_time']:
        failures.append(f"Average response time {stats.total.avg_response_time:.2f}ms exceeds threshold {PERFORMANCE_THRESHOLDS['max_avg_response_time']}ms")
    
    # Check failure rate
    failure_rate = stats.total.num_failures / max(stats.total.num_requests, 1)
    if failure_rate > PERFORMANCE_THRESHOLDS['max_failure_rate']:
        failures.append(f"Failure rate {failure_rate:.2%} exceeds threshold {PERFORMANCE_THRESHOLDS['max_failure_rate']:.2%}")
    
    # Check requests per second
    if stats.total.current_rps < PERFORMANCE_THRESHOLDS['min_requests_per_second']:
        failures.append(f"Requests per second {stats.total.current_rps:.2f} below threshold {PERFORMANCE_THRESHOLDS['min_requests_per_second']}")
    
    return failures

if __name__ == "__main__":
    print("=== Wall-E Load Test Configuration ===")
    print(f"Users: {LOAD_TEST_CONFIG['users']}")
    print(f"Spawn Rate: {LOAD_TEST_CONFIG['spawn_rate']}")
    print(f"Run Time: {LOAD_TEST_CONFIG['run_time']}")
    print(f"Host: {LOAD_TEST_CONFIG['host']}")
    print("Performance Thresholds:")
    for key, value in PERFORMANCE_THRESHOLDS.items():
        print(f"  {key}: {value}") 