import sqlite3
import os

def delete_tables():
    try:
        # Connect to the database
        conn = sqlite3.connect('pos.db')
        cursor = conn.cursor()
        
        # Drop the tables if they exist
        cursor.execute("DROP TABLE IF EXISTS orders")
        cursor.execute("DROP TABLE IF EXISTS customer_sequence")
        
        # Commit the changes
        conn.commit()
        print("Tables 'orders' and 'customer_sequence' have been successfully deleted.")
        
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        
    finally:
        # Close the connection
        if conn:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    # Check if database exists
    if not os.path.exists('pos.db'):
        print("Database 'pos.db' does not exist.")
    else:
        # Confirm with user before deletion
        confirm = input("Are you sure you want to delete the orders and customer_sequence tables? (yes/no): ")
        if confirm.lower() == 'yes':
            delete_tables()
        else:
            print("Operation cancelled.")