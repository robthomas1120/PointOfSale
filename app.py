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
   
   # Check if status column exists in orders table
   c.execute("PRAGMA table_info(orders)")
   columns = [column[1] for column in c.fetchall()]
    
   if 'status' not in columns:
       c.execute('ALTER TABLE orders ADD COLUMN status TEXT DEFAULT "pending"')

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
   
   # Create orders table with both daily and monthly customer numbers
   c.execute('''
       CREATE TABLE IF NOT EXISTS orders (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           daily_customer_number INTEGER,
           monthly_customer_number INTEGER,
           items TEXT,
           total_amount REAL,
           order_date DATETIME DEFAULT CURRENT_TIMESTAMP
       )
   ''')

   c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            daily_customer_number INTEGER,
            monthly_customer_number INTEGER,
            items TEXT,
            total_amount REAL,
            order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending'
        )
    ''')
   
   # Modified customer_sequence table to track both daily and monthly sequences
   c.execute('''
       CREATE TABLE IF NOT EXISTS customer_sequence (
           id INTEGER PRIMARY KEY,
           daily_value INTEGER,
           monthly_value INTEGER,
           last_daily_reset DATE,
           last_monthly_reset DATE
       )
   ''')
   
   # Initialize the sequence if it's empty
   c.execute('SELECT daily_value FROM customer_sequence WHERE id = 1')
   if not c.fetchone():
       today = datetime.now().date()
       c.execute('''
           INSERT INTO customer_sequence (
               id, daily_value, monthly_value, 
               last_daily_reset, last_monthly_reset
           ) VALUES (1, 1, 1, ?, ?)
       ''', (today.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')))
   
   reset_customer_sequence()
   
   conn.commit()
   conn.close()

@app.route('/')
def index():
   return render_template('index.html')

@app.route('/add')
def add_item_page():
    return render_template('add_item.html')

@app.route('/update_price', methods=['POST'])
def update_price():
    try:
        data = request.json
        item_name = data['item_name']
        new_price = data['new_price']
        
        conn = sqlite3.connect('pos.db')
        c = conn.cursor()
        
        c.execute('''
            UPDATE items 
            SET price = ? 
            WHERE item_name = ?
        ''', (new_price, item_name))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/order_history')
def order_history():
    return render_template('orderHistory.html')

@app.route('/kitchen')
def kitchen_display():
    return render_template('kitchen.html')

@app.route('/get_kitchen_orders')
def get_kitchen_orders():
    try:
        conn = sqlite3.connect('pos.db')
        c = conn.cursor()
        
        # Only get orders with status 'pending' or NULL status
        c.execute('''
            SELECT id, daily_customer_number, monthly_customer_number, 
                   items, total_amount, order_date
            FROM orders
            WHERE (status IS NULL OR status = 'pending')
                AND order_date >= datetime('now', '-1 day')
            ORDER BY order_date DESC
        ''')
        
        orders = []
        for row in c.fetchall():
            try:
                orders.append({
                    'id': row[0],
                    'dailyCustomerNumber': row[1],
                    'monthlyCustomerNumber': row[2],
                    'items': row[3],
                    'totalAmount': row[4],
                    'date': row[5],
                    'status': 'pending'
                })
            except Exception as row_error:
                print(f"Error processing row: {row_error}")
                continue
        
        conn.close()
        return jsonify(orders)
    except Exception as e:
        print(f"Database error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/complete_order', methods=['POST'])
def complete_order():
    try:
        data = request.json
        order_id = data['orderId']
        
        conn = sqlite3.connect('pos.db')
        c = conn.cursor()
        
        # Update the order status
        c.execute('''
            UPDATE orders 
            SET status = 'completed' 
            WHERE id = ?
        ''', (order_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error completing order: {str(e)}")
        return jsonify({'error': str(e)}), 500

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

def get_and_update_customer_numbers():
    conn = sqlite3.connect('pos.db')
    c = conn.cursor()
    
    try:
        # Get current sequence info
        c.execute('''
            SELECT daily_value, monthly_value, 
                   last_daily_reset, last_monthly_reset 
            FROM customer_sequence WHERE id = 1
        ''')
        daily_value, monthly_value, last_daily_reset, last_monthly_reset = c.fetchone()
        
        # Convert stored dates to date objects
        last_daily = datetime.strptime(last_daily_reset, '%Y-%m-%d').date()
        today = datetime.now().date()
        
        # Check if we need to reset daily sequence (comparing actual dates)
        if today != last_daily:
            # Reset daily sequence to 1 and update last_daily_reset
            daily_number = 1
            c.execute('''
                UPDATE customer_sequence 
                SET daily_value = ?, last_daily_reset = ? 
                WHERE id = 1
            ''', (daily_number, today.strftime('%Y-%m-%d')))
        else:
            # Use current daily value as the customer number, then increment for next time
            daily_number = daily_value
            c.execute('UPDATE customer_sequence SET daily_value = ? WHERE id = 1', (daily_value + 1,))
        
        # Check if we need to reset monthly sequence
        last_monthly = datetime.strptime(last_monthly_reset, '%Y-%m-%d').date()
        if today.month != last_monthly.month or today.year != last_monthly.year:
            # Reset monthly sequence to 1 and update last_monthly_reset
            monthly_number = 1
            c.execute('''
                UPDATE customer_sequence 
                SET monthly_value = ?, last_monthly_reset = ? 
                WHERE id = 1
            ''', (monthly_number, today.strftime('%Y-%m-%d')))
        else:
            # Use current monthly value, then increment for next time
            monthly_number = monthly_value
            c.execute('UPDATE customer_sequence SET monthly_value = ? WHERE id = 1', (monthly_value + 1,))
        
        conn.commit()
        return daily_number, monthly_number
        
    finally:
        conn.close()

def reset_customer_sequence():
    conn = sqlite3.connect('pos.db')
    c = conn.cursor()
    try:
        today = datetime.now().date()
        # Set both values to 1 and let the get_and_update function handle the increment
        c.execute('''
            UPDATE customer_sequence 
            SET daily_value = 1,
                monthly_value = 1,
                last_daily_reset = ?,
                last_monthly_reset = ?
            WHERE id = 1
        ''', (today.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')))
        
        # If no rows were updated, insert initial values
        if c.rowcount == 0:
            c.execute('''
                INSERT INTO customer_sequence (
                    id, daily_value, monthly_value, 
                    last_daily_reset, last_monthly_reset
                ) VALUES (1, 1, 1, ?, ?)
            ''', (today.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')))
        
        conn.commit()
    finally:
        conn.close()

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
        
        # Get both customer numbers with potential resets
        daily_number, monthly_number = get_and_update_customer_numbers()
        
        # Insert the order with status
        c.execute('''
            INSERT INTO orders (
                daily_customer_number, monthly_customer_number,
                items, total_amount, order_date, status
            ) VALUES (?, ?, ?, ?, datetime('now', 'localtime'), 'pending')
        ''', (
            daily_number,
            monthly_number,
            json.dumps(order_data['items']),
            order_data['totalAmount']
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'daily_customer_number': daily_number,
            'monthly_customer_number': monthly_number
        })
        
    except Exception as e:
        print(f"Error placing order: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_orders_history')
def get_orders_history():
    conn = sqlite3.connect('pos.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT daily_customer_number, monthly_customer_number, 
               items, total_amount, order_date
        FROM orders
        ORDER BY order_date DESC
    ''')
    
    orders = []
    for row in c.fetchall():
        orders.append({
            'dailyCustomerNumber': row[0],
            'monthlyCustomerNumber': row[1],
            'items': json.loads(row[2]),
            'totalAmount': row[3],
            'date': row[4]
        })
    
    conn.close()
    return jsonify(orders)

if __name__ == '__main__':
   init_db()
   app.run(debug=True)