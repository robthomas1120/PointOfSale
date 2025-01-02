let orderHistory = [];

// Function to load orders from server
async function loadOrders() {
    try {
        const response = await fetch('/get_orders_history');
        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }
        const orders = await response.json();
        console.log('Loaded orders:', orders); // Debug log
        orderHistory = orders;
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersList').innerHTML = `
            <tr>
                <td colspan="5">Error loading orders. Please try again later.</td>
            </tr>
        `;
    }
}

// Function to format date
function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
}

// Function to format time in 12-hour format
function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

// Function to display orders
function displayOrders() {
    const ordersList = document.getElementById('ordersList');
    
    if (orderHistory.length === 0) {
        ordersList.innerHTML = `
            <tr>
                <td colspan="5">No orders found</td>
            </tr>
        `;
        return;
    }
    
    ordersList.innerHTML = orderHistory.map(order => `
        <tr>
            <td>Customer #${order.customerNumber}</td>
            <td>${formatDate(order.date)}</td>
            <td>${formatTime(order.date)}</td>
            <td>
                ${order.items.map(item => 
                    `${item.name} (x${item.quantity})`
                ).join(', ')}
            </td>
            <td>₱${order.totalAmount.toFixed(2)}</td>
        </tr>
    `).join('');
}

// Add event listener for when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, fetching orders...'); // Debug log
    loadOrders();
});