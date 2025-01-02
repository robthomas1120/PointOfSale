let orderHistory = [];
let filteredOrders = [];
let exportDialog;

async function loadOrders() {
    try {
        const response = await fetch('/get_orders_history');
        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }
        const orders = await response.json();
        orderHistory = orders;
        filteredOrders = [...orders];
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

function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
}

function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

function formatOrderItems(items) {
    return items.map(item => 
        `${item.name} x${item.quantity} = ₱${(item.price * item.quantity).toFixed(2)}`
    ).join('<br>');
}

function applySort() {
    const sortBy = document.getElementById('sortBy').value;
    const sortOrder = document.getElementById('sortOrder').value;

    filteredOrders.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
            case 'date':
                comparison = new Date(a.date) - new Date(b.date);
                break;
            case 'dailyCustomerNumber':
                comparison = a.dailyCustomerNumber - b.dailyCustomerNumber;
                break;
            case 'monthlyCustomerNumber':
                comparison = a.monthlyCustomerNumber - b.monthlyCustomerNumber;
                break;
            case 'totalAmount':
                comparison = a.totalAmount - b.totalAmount;
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    displayOrders();
}

function displayOrders() {
    const ordersList = document.getElementById('ordersList');
    
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = `
            <tr>
                <td colspan="6">No orders found</td>
            </tr>
        `;
        return;
    }
    
    ordersList.innerHTML = filteredOrders.map(order => `
        <tr>
            <td>${order.dailyCustomerNumber}</td>
            <td>${formatDate(order.date)}</td>
            <td>${formatTime(order.date)}</td>
            <td class="order-details">
                ${formatOrderItems(order.items)}
            </td>
            <td>₱${order.totalAmount.toFixed(2)}</td>
            <td>${order.monthlyCustomerNumber}</td>
        </tr>
    `).join('');
}


function applyDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    filteredOrders = orderHistory.filter(order => {
        const orderDate = new Date(order.date);
        const orderTime = orderDate.toTimeString().slice(0, 8);
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59);
            if (orderDate < start || orderDate > end) return false;
        }

        if (startTime && endTime) {
            if (orderTime < startTime || orderTime > endTime) return false;
        }

        return true;
    });

    displayOrders();
}

function resetFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('sortBy').value = 'date';
    document.getElementById('sortOrder').value = 'desc';

    filteredOrders = [...orderHistory];
    displayOrders();
}

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    
    // Initialize export dialog
    exportDialog = new ExportDialog();
    
    // Add all event listeners
    document.getElementById('applySort').addEventListener('click', applySort);
    document.getElementById('applyDateFilter').addEventListener('click', applyDateFilter);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.getElementById('exportButton').addEventListener('click', () => {
        const currentFilters = {
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            sortBy: document.getElementById('sortBy').value,
            sortOrder: document.getElementById('sortOrder').value
        };
        exportDialog.show(currentFilters, filteredOrders);  // Pass filteredOrders here
    });
});