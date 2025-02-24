// kitchen.js
let orders = [];
const REFRESH_INTERVAL = 10000; // Refresh every 10 seconds
const kitchenChannel = new BroadcastChannel('kitchen_updates');

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString();
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-card ${order.status || 'pending'}`;
    card.id = `order-${order.id}`;

    // Parse items and ensure it's valid
    let items;
    try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    } catch (e) {
        console.error('Error parsing items:', e);
        items = [];
    }

    // Create items HTML with proper formatting
    const itemsHtml = items.map(item => `
        <div class="order-item">
            <span class="quantity">x${item.quantity}</span>
            <span class="item-name">${item.name}</span>
        </div>
    `).join('');

    // Format order type and table info
    const orderTypeText = order.order_type === 1 ? 'Dine In' : 'Take Out';
    const tableInfo = order.order_type === 1 ? `<div class="table-number">Table #${order.table_num || ''}</div>` : '';

    // Ensure we have a valid date
    const orderDate = order.order_date ? new Date(order.order_date) : new Date();
    const formattedTime = isNaN(orderDate.getTime()) ? 'Invalid Date' : formatTime(orderDate);

    card.innerHTML = `
        <div class="order-header">
            <div class="order-number">
                Daily #${order.daily_customer_number || '---'}<br>
                Monthly #${order.monthly_customer_number || '---'}
            </div>
            <div class="order-info">
                <div class="order-type">${orderTypeText}</div>
                ${tableInfo}
                <div class="order-time">${formattedTime}</div>
            </div>
        </div>
        <div class="order-items">
            ${itemsHtml}
        </div>
        <div class="order-actions">
            ${order.status !== 'completed' ? 
                `<button class="complete-btn" onclick="completeOrder(${order.id})">
                    Complete Order
                </button>` : ''
            }
        </div>
    `;

    return card;
}

async function loadOrders() {
    try {
        const response = await fetch('/get_kitchen_orders');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newOrders = await response.json();
        
        if (Array.isArray(newOrders)) {
            // Broadcast new orders to other windows
            kitchenChannel.postMessage({
                type: 'ordersUpdated',
                orders: newOrders
            });
            
            orders = newOrders;
            displayOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = ''; // Clear current orders
    
    orders.forEach(order => {
        const card = createOrderCard(order);
        container.appendChild(card);
    });
}

async function completeOrder(orderId) {
    try {
        const response = await fetch('/complete_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId })
        });

        if (response.ok) {
            // Broadcast the completion to other windows
            kitchenChannel.postMessage({
                type: 'orderCompleted',
                orderId: orderId
            });
            
            // Remove the completed order card from the DOM
            const orderCard = document.getElementById(`order-${orderId}`);
            if (orderCard) {
                orderCard.remove();
            }
            
            // Remove the order from our local array
            orders = orders.filter(order => order.id !== orderId);
        }
    } catch (error) {
        console.error('Error completing order:', error);
    }
}

kitchenChannel.onmessage = (event) => {
    if (event.data.type === 'orderCompleted') {
        // Remove the completed order from this window
        const orderCard = document.getElementById(`order-${event.data.orderId}`);
        if (orderCard) {
            orderCard.remove();
        }
        
        // Update local orders array
        orders = orders.filter(order => order.id !== event.data.orderId);
    }
};

kitchenChannel.onmessage = (event) => {
    if (event.data.type === 'orderCompleted') {
        // Handle completed orders
        const orderCard = document.getElementById(`order-${event.data.orderId}`);
        if (orderCard) {
            orderCard.remove();
        }
        orders = orders.filter(order => order.id !== event.data.orderId);
    } else if (event.data.type === 'ordersUpdated') {
        // Update orders if they're different
        if (JSON.stringify(orders) !== JSON.stringify(event.data.orders)) {
            orders = event.data.orders;
            displayOrders();
        }
    }
};

window.addEventListener('beforeunload', () => {
    kitchenChannel.close();
});

// Event Listeners
document.getElementById('refreshBtn').addEventListener('click', loadOrders);

// Initial load and set up auto-refresh
loadOrders();
setInterval(loadOrders, REFRESH_INTERVAL);