from huey import crontab
from huey_instance import huey
from firebase import Firebase
import sqlite3

@huey.task(retries=3, retry_delay=10)
def queue_fb_sync(array):
    try:
        firebase = Firebase()
        firebase.sync_order(array)
        print("Synced order!")

        conn = sqlite3.connect('pos.db')
        c = conn.cursor()
        
        print(array[0])

        c.execute('''
            UPDATE orders SET synced = TRUE WHERE id = ?
        ''', (array[0],))

        conn.commit()
        conn.close()

    except Exception as e:
        print(f"Failed to write to Firebase: {e}, retrying...")
        raise e
    
@huey.periodic_task(crontab(minute='*')) 
def hourly_task():
    try:
        conn = sqlite3.connect('pos.db')
        c = conn.cursor()

        c.execute('''
            SELECT id, daily_customer_number, monthly_customer_number, items, total_amount, discounted_total, order_date FROM orders WHERE synced = FALSE
        ''')

        for items in c.fetchall():
            queue_fb_sync(items)

        conn.close()
    except Exception as e:
        print(f"Hourly task failed: {e}")