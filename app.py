from flask import Flask, request, jsonify, render_template
from datetime import datetime
import sqlite3
import os
import json

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'

if not os.path.exists(app.config['UPLOAD_FOLDER']):
   os.makedirs(app.config['UPLOAD_FOLDER'])

def init_db():
   conn = sqlite3.connect('pos.db')
   c = conn.cursor()
   # Create items table
   c.execute('''
       CREATE TABLE IF NOT EXISTS items (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           item_name TEXT,
           price REAL,
           image_path TEXT,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP
       )
   ''')
   
   # Create orders table
   c.execute('''
       CREATE TABLE IF NOT EXISTS orders (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           customer_number INTEGER,
           items TEXT,
           total_amount REAL,
           order_date DATETIME DEFAULT CURRENT_TIMESTAMP
       )
   ''')
   
   # Create a sequence for customer numbers
   c.execute('''
       CREATE TABLE IF NOT EXISTS customer_sequence (
           id INTEGER PRIMARY KEY,
           next_value INTEGER
       )
   ''')
   
   # Initialize the sequence if it's empty
   c.execute('SELECT next_value FROM customer_sequence WHERE id = 1')
   if not c.fetchone():
       c.execute('INSERT INTO customer_sequence (id, next_value) VALUES (1, 1)')
   
   conn.commit()
   conn.close()

@app.route('/')
def index():  
   return render_template('index.html')

@app.route('/add')
def add_item_page():
    return render_template('add_item.html')

@app.route('/order_history')
def order_history():
    return render_template('orderHistory.html')

@app.route('/add_order', methods=['POST'])
def add_order():
   if 'image' not in request.files:
       return jsonify({'error': 'No image provided'}), 400
   
   file = request.files['image']
   if file.filename == '':
       return jsonify({'error': 'No selected file'}), 400

   filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
   file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
   file.save(file_path)

   item_name = request.form.get('item_name')
   price = request.form.get('price')

   conn = sqlite3.connect('pos.db')
   c = conn.cursor()
   c.execute('''
       INSERT INTO items (item_name, price, image_path)
       VALUES (?, ?, ?)
   ''', (item_name, price, filename))
   conn.commit()
   conn.close()

   return jsonify({'success': True, 'image_path': filename})

@app.route('/get_orders/1')
def get_orders():
   conn = sqlite3.connect('pos.db')
   c = conn.cursor()
   c.execute('SELECT item_name, price, image_path FROM items ORDER BY id DESC')
   items = [{'item_name': row[0], 'price': row[1], 'image_path': row[2]} for row in c.fetchall()]
   conn.close()
   return jsonify(items)

@app.route('/place_order', methods=['POST'])
def place_order():
    try:
        order_data = request.json
        conn = sqlite3.connect('pos.db')
        c = conn.cursor()
        
        # Get next customer number
        c.execute('SELECT next_value FROM customer_sequence WHERE id = 1')
        customer_number = c.fetchone()[0]
        
        # Increment the sequence
        c.execute('UPDATE customer_sequence SET next_value = next_value + 1 WHERE id = 1')
        
        # Insert the order
        c.execute('''
            INSERT INTO orders (customer_number, items, total_amount, order_date)
            VALUES (?, ?, ?, datetime('now', 'localtime'))
        ''', (
            customer_number,
            json.dumps(order_data['items']),
            order_data['totalAmount']
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'customer_number': customer_number
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_orders_history')
def get_orders_history():
    conn = sqlite3.connect('pos.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT customer_number, items, total_amount, order_date
        FROM orders
        ORDER BY order_date DESC
    ''')
    
    orders = []
    for row in c.fetchall():
        orders.append({
            'customerNumber': row[0],
            'items': json.loads(row[1]),
            'totalAmount': row[2],
            'date': row[3]
        })
    
    conn.close()
    return jsonify(orders)

if __name__ == '__main__':
   init_db()
   app.run(debug=True)