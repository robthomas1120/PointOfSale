from flask import Flask, request, jsonify, render_template
from datetime import datetime
import sqlite3
import os
import json
from firebase import Firebase

app = Flask(__name__)
firebase = Firebase()
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
    
    # Create orders table with all required columns
    c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            daily_customer_number INTEGER,
            monthly_customer_number INTEGER,
            items TEXT,
            total_amount REAL,
            discounted_total REAL,
            order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending'
        )
    ''')
   
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

@app.route('/get_orders/1')
def get_orders():
   conn = sqlite3.connect('pos.db')
   c = conn.cursor()
   c.execute('SELECT item_name, price, image_path FROM items ORDER BY id DESC')
   items = [{'item_name': row[0], 'price': row[1], 'image_path': row[2]} for row in c.fetchall()]
   conn.close()
   return jsonify(items)

@app.route('/receipt')
def receipt():
    return render_template('receipt.html')

@app.route('/place_order', methods=['POST'])
def place_order():
    try:
        
        order_data = request.json
        conn = sqlite3.connect('pos.db')
        c = conn.cursor()
        
        # daily_number, monthly_number = get_and_update_customer_numbers()
        
        # Make sure discounted_total has a default value if not provided
        discounted_total = order_data.get('discountedTotal', order_data['totalAmount'])
        last_inserted = c.lastrowid

        c.execute('''
            INSERT INTO orders (
                daily_customer_number, monthly_customer_number,
                items, total_amount, discounted_total, order_date, status
            )
            VALUES (
                COALESCE((
                    SELECT daily_customer_number + 1 
                    FROM orders 
                    WHERE date(order_date) = date('now', 'localtime')
                    ORDER BY order_date DESC 
                    LIMIT 1
                ), 1),
                COALESCE((
                    SELECT monthly_customer_number + 1 
                    FROM orders 
                    WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now', 'localtime')
                    ORDER BY order_date DESC 
                    LIMIT 1
                ), 1),
                ?, ?, ?, datetime('now', 'localtime'), 'pending'
            );
        ''', (
            json.dumps(order_data['items']),
            order_data['totalAmount'],
            discounted_total
        ))

        last_inserted = int(c.lastrowid)
        print(last_inserted)

        c.execute('''
            SELECT daily_customer_number, monthly_customer_number FROM orders WHERE rowid = ?
        ''', (last_inserted,))

        daily_number, monthly_number = c.fetchone()

        print(daily_number, monthly_number)

        # firebase.sync_order([daily_number, monthly_number, json.dumps(order_data['items']), order_data['totalAmount'], discounted_total, str(datetime.now())])
        
        conn.commit()
        conn.close()
        
        print('tite')

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
               items, total_amount, discounted_total, order_date
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
            'discountedTotal': row[4] if row[4] is not None else row[3],  # Use total_amount if discounted is NULL
            'date': row[5]
        })
    
    conn.close()
    return jsonify(orders)

if __name__ == '__main__':
   init_db()
   app.run(debug=True)