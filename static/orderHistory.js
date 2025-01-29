let orderHistory = [];
let filteredOrders = [];
let exportDialog;

async function loadOrders() {
    try {
        const response = await fetch('/get_orders_history');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            originalOrders = data;
            displayOrders(originalOrders);
        } else {
            console.error('Invalid response data:', data);
            alert('Failed to load orders. Please try again.');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Failed to load orders. Please try again.');
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

function handleRowClick(order) {
    if (confirm('Do you want to print this order?')) {
        const receiptUrl = `/receipt?dailyCustomerNumber=${order.dailyCustomerNumber}&date=${order.date}&items=${encodeURIComponent(JSON.stringify(order.items))}&totalAmount=${order.totalAmount}&discountedTotal=${order.discountedTotal}&monthlyCustomerNumber=${order.monthlyCustomerNumber}`;
        const receiptWindow = window.open(receiptUrl, '_blank');

        receiptWindow.onload = function() {
            setTimeout(() => {
                receiptWindow.print();
                receiptWindow.close();
            }, 500);
        };
    }
}

function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '';

    if (!Array.isArray(orders)) {
        console.error('Invalid orders data:', orders);
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.dailyCustomerNumber}</td>
            <td>${new Date(order.date).toLocaleDateString()}</td>
            <td>${new Date(order.date).toLocaleTimeString()}</td>
            <td class="order-details">${order.items.map(item => `${item.quantity}x ${item.name}`).join('\n')}</td>
            <td>₱${order.totalAmount.toFixed(2)}</td>
            <td>₱${order.discountedTotal.toFixed(2)}</td>
            <td>${order.monthlyCustomerNumber}</td>
        `;
        
        // Attach the click event listener to the row
        row.addEventListener('click', () => handleRowClick(order));
        
        ordersList.appendChild(row);
    });
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