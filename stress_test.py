import sqlite3

conn = sqlite3.connect('pos.db')
c = conn.cursor()

for i in range(1000):
    print("Adding order...")

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
        '[{"name": "guhan", "price": 45, "imagePath": "20250102_173336_guhan.png", "quantity": 1, "discounted": false}, {"name": "pork curry ramen SMALL", "price": 155, "imagePath": "20250102_173054_pork curry ramen S.png", "quantity": 1, "discounted": false}, {"name": "spicy salmon roll", "price": 175, "imagePath": "20250102_172812_spicy salmon roll.png", "quantity": 1, "discounted": false}]',
        100,
        100
    ))
    conn.commit()
conn.close()