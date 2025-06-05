#!/usr/bin/env python3
"""
Wall-E Load Test Data Cleanup Script
Cleans up test data generated during load testing
"""

import os
import sys
import psycopg2
from datetime import datetime, timedelta
import argparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'walle_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

def connect_to_database():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to database: {e}")
        return None

def cleanup_test_users(conn, hours_ago=1):
    """Clean up test users created during load testing"""
    cursor = conn.cursor()
    
    # Calculate cutoff time
    cutoff_time = datetime.now() - timedelta(hours=hours_ago)
    
    try:
        # Get test users (emails with faker patterns or test patterns)
        cursor.execute("""
            SELECT id, email FROM "User" 
            WHERE (
                email LIKE '%@example.%' 
                OR email LIKE '%test%'
                OR email LIKE '%faker%'
                OR email LIKE '%locust%'
                OR "createdAt" > %s
            )
        """, (cutoff_time,))
        
        test_users = cursor.fetchall()
        
        if not test_users:
            print("No test users found to clean up.")
            return 0
        
        user_ids = [user[0] for user in test_users]
        emails = [user[1] for user in test_users]
        
        print(f"Found {len(test_users)} test users to clean up:")
        for email in emails[:10]:  # Show first 10
            print(f"  - {email}")
        if len(emails) > 10:
            print(f"  ... and {len(emails) - 10} more")
        
        # Delete transactions first (due to foreign key constraints)
        cursor.execute("""
            DELETE FROM "Transaction" 
            WHERE "senderWalletId" IN (
                SELECT id FROM "Wallet" WHERE "userId" = ANY(%s)
            ) OR "receiverWalletId" IN (
                SELECT id FROM "Wallet" WHERE "userId" = ANY(%s)
            ) OR "effectedWalletId" IN (
                SELECT id FROM "Wallet" WHERE "userId" = ANY(%s)
            )
        """, (user_ids, user_ids, user_ids))
        
        transactions_deleted = cursor.rowcount
        print(f"Deleted {transactions_deleted} transactions")
        
        # Delete wallets
        cursor.execute("""
            DELETE FROM "Wallet" WHERE "userId" = ANY(%s)
        """, (user_ids,))
        
        wallets_deleted = cursor.rowcount
        print(f"Deleted {wallets_deleted} wallets")
        
        # Delete users
        cursor.execute("""
            DELETE FROM "User" WHERE id = ANY(%s)
        """, (user_ids,))
        
        users_deleted = cursor.rowcount
        print(f"Deleted {users_deleted} users")
        
        conn.commit()
        return users_deleted
        
    except psycopg2.Error as e:
        print(f"Error during cleanup: {e}")
        conn.rollback()
        return 0
    finally:
        cursor.close()

def cleanup_old_transactions(conn, days_ago=7):
    """Clean up old test transactions"""
    cursor = conn.cursor()
    
    cutoff_time = datetime.now() - timedelta(days=days_ago)
    
    try:
        # Delete old transactions with test patterns in description
        cursor.execute("""
            DELETE FROM "Transaction" 
            WHERE "createdAt" < %s 
            AND (
                description LIKE '%test%' 
                OR description LIKE '%Test%'
                OR description LIKE '%locust%'
                OR description LIKE '%faker%'
            )
        """, (cutoff_time,))
        
        deleted_count = cursor.rowcount
        print(f"Deleted {deleted_count} old test transactions")
        
        conn.commit()
        return deleted_count
        
    except psycopg2.Error as e:
        print(f"Error cleaning up transactions: {e}")
        conn.rollback()
        return 0
    finally:
        cursor.close()

def reset_system_wallet(conn):
    """Reset system wallet balance to 0"""
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE "Wallet" 
            SET balance = 0 
            WHERE "userId" = (
                SELECT id FROM "User" WHERE email = 'system@walle.internal'
            )
        """)
        
        if cursor.rowcount > 0:
            print("Reset system wallet balance to 0")
        
        conn.commit()
        
    except psycopg2.Error as e:
        print(f"Error resetting system wallet: {e}")
        conn.rollback()
    finally:
        cursor.close()

def get_database_stats(conn):
    """Get current database statistics"""
    cursor = conn.cursor()
    
    try:
        # Get user count
        cursor.execute('SELECT COUNT(*) FROM "User"')
        user_count = cursor.fetchone()[0]
        
        # Get wallet count
        cursor.execute('SELECT COUNT(*) FROM "Wallet"')
        wallet_count = cursor.fetchone()[0]
        
        # Get transaction count
        cursor.execute('SELECT COUNT(*) FROM "Transaction"')
        transaction_count = cursor.fetchone()[0]
        
        # Get total wallet balance
        cursor.execute('SELECT SUM(balance) FROM "Wallet"')
        total_balance = cursor.fetchone()[0] or 0
        
        print("\n=== Database Statistics ===")
        print(f"Users: {user_count}")
        print(f"Wallets: {wallet_count}")
        print(f"Transactions: {transaction_count}")
        print(f"Total Balance: ${total_balance:.2f}")
        
    except psycopg2.Error as e:
        print(f"Error getting database stats: {e}")
    finally:
        cursor.close()

def main():
    parser = argparse.ArgumentParser(description='Clean up Wall-E load test data')
    parser.add_argument('--hours', type=int, default=1, 
                       help='Clean up users created in the last N hours (default: 1)')
    parser.add_argument('--days', type=int, default=7,
                       help='Clean up transactions older than N days (default: 7)')
    parser.add_argument('--reset-system-wallet', action='store_true',
                       help='Reset system wallet balance to 0')
    parser.add_argument('--stats-only', action='store_true',
                       help='Only show database statistics, no cleanup')
    
    args = parser.parse_args()
    
    print("=== Wall-E Load Test Data Cleanup ===")
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        print("Failed to connect to database")
        sys.exit(1)
    
    try:
        if args.stats_only:
            get_database_stats(conn)
        else:
            print(f"Cleaning up test data...")
            
            # Clean up test users
            users_cleaned = cleanup_test_users(conn, args.hours)
            
            # Clean up old transactions
            transactions_cleaned = cleanup_old_transactions(conn, args.days)
            
            # Reset system wallet if requested
            if args.reset_system_wallet:
                reset_system_wallet(conn)
            
            print(f"\nCleanup completed:")
            print(f"  - {users_cleaned} test users removed")
            print(f"  - {transactions_cleaned} old transactions removed")
            
            # Show final stats
            get_database_stats(conn)
    
    finally:
        conn.close()

if __name__ == "__main__":
    main() 