import firebase_admin
import google.cloud
from firebase_admin import credentials, firestore
import sqlite3
from datetime import datetime
import copy

class Firebase():
    def __init__(self):
        if not firebase_admin._apps:
            self.cred = credentials.Certificate(".hidden/credentials.json")
            self.app = firebase_admin.initialize_app(self.cred)
        
        self.store = firestore.client()
        self.headers = ['id', 'daily_customer_number', 'monthly_customer_number', 'items', 'total_amount', 'discounted_total', 'order_date', 'status']

    @staticmethod
    def batch_data(iterable, n=1):
        l = len(iterable)
        for ndx in range(0, l, n):
            yield iterable[ndx:min(ndx + n, l)]

    # Get orders from DB and upload to Firestore
    # this is destructive, it will delete all orders in Firestore
    # use sparingly
    def sync_all_orders(self):
        conn = sqlite3.connect('pos.db')
        c = conn.cursor()
        data = []

        c.execute("SELECT * FROM orders")
        for row in c.fetchall():
            data_item = dict(zip(self.headers, row))
            data_item.pop('status')
            data.append(data_item)

        for doc in self.store.collection('orders').stream():
            doc.reference.delete()

        for batched_data in self.batch_data(data, 499):
            batch = self.store.batch()
            for data_item in batched_data:
                data_id = data_item.pop('id')
                data_item["date_synced"] = str(datetime.now())
                doc_ref = self.store.collection('orders').document(str(data_id)) # use id as document name for debugging; can change later
                batch.set(doc_ref, data_item)
            batch.commit()

        conn.close()

        print("Orders uploaded to Firestore.")

    def sync_order(self, raw_data):
        header = copy.deepcopy(self.headers)
        # header.remove('id')
        header.remove('status')

        batch = self.store.batch()
        data_item = dict(zip(header, raw_data))
        uuid = data_item.pop('id')
        data_item["date_synced"] = str(datetime.now())

        doc_ref = self.store.collection('orders').document(str(uuid))
        batch.set(doc_ref, data_item)

        batch.commit()

        return uuid