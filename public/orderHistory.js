let orderHistory = [];
let filteredOrders = [];
let exportDialog;

async function loadOrders() {
    try {
        console.log('Loading orders...');
        const response = await fetch('/get_orders_history');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Orders loaded:', data);
        
        if (Array.isArray(data)) {
            orderHistory = data;
            filteredOrders = [...data];
            displayOrders(filteredOrders);
        } else {
            console.error('Invalid response data:', data);
            alert('Failed to load orders. Please try again.');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Failed to load orders. Please try again.');
    }
}

function handleRowClick(order) {
    console.log('Row clicked, order:', order);
    if (confirm('Do you want to print this order?')) {
        const receiptUrl = `/receipt?` + new URLSearchParams({
            dailyCustomerNumber: order.dailyCustomerNumber,
            date: order.date,
            items: JSON.stringify(order.items),
            totalAmount: order.totalAmount,
            discountedTotal: order.discountedTotal,
            monthlyCustomerNumber: order.monthlyCustomerNumber
        });

        console.log('Opening receipt URL:', receiptUrl);
        const receiptWindow = window.open(receiptUrl, '_blank');

        if (receiptWindow) {
            receiptWindow.onload = function() {
                console.log('Receipt window loaded, printing...');
                setTimeout(() => {
                    receiptWindow.print();
                    receiptWindow.close();
                }, 500);
            };
        } else {
            console.error('Failed to open receipt window');
            alert('Please allow pop-ups to print receipts');
        }
    }
}

function applyDateFilter() {
    console.log('Applying date filter...');
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    console.log('Filter values:', { startDate, endDate, startTime, endTime });

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

    console.log('Filtered orders:', filteredOrders);
    displayOrders(filteredOrders);
}

function applySort() {
    console.log('Applying sort...');
    const sortBy = document.getElementById('sortBy').value;
    const sortOrder = document.getElementById('sortOrder').value;

    console.log('Sort values:', { sortBy, sortOrder });

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

    console.log('Sorted orders:', filteredOrders);
    displayOrders(filteredOrders);
}

function resetFilters() {
    console.log('Resetting filters...');
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('sortBy').value = 'date';
    document.getElementById('sortOrder').value = 'desc';

    filteredOrders = [...orderHistory];
    displayOrders(filteredOrders);
}

function displayOrders(orders = filteredOrders) {
    console.log('Displaying orders:', orders);
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
            <td class="order-details">${order.items.map(item => 
                `${item.quantity}x ${item.name}`).join('<br>')}</td>
            <td>₱${order.totalAmount.toFixed(2)}</td>
            <td>₱${order.discountedTotal.toFixed(2)}</td>
            <td>${order.monthlyCustomerNumber}</td>
        `;
        
        // Add cursor pointer style to indicate clickable row
        row.style.cursor = 'pointer';
        
        // Add click event listener for receipt printing
        row.addEventListener('click', () => handleRowClick(order));
        
        ordersList.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing page...');
    
    // Initialize export dialog
    exportDialog = new ExportDialog();
    
    // Load initial orders
    loadOrders();
    
    // Add event listeners
    document.getElementById('applySort').addEventListener('click', applySort);
    document.getElementById('applyDateFilter').addEventListener('click', applyDateFilter);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.getElementById('exportButton').addEventListener('click', () => {
        console.log('Export button clicked');
        const currentFilters = {
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            sortBy: document.getElementById('sortBy').value,
            sortOrder: document.getElementById('sortOrder').value
        };
        console.log('Current filters:', currentFilters);
        console.log('Filtered orders to export:', filteredOrders);
        exportDialog.show(currentFilters, filteredOrders);
    });
});