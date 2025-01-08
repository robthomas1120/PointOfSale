// Cart state
let cart = [];
let allItems = []; // Store all items
let searchInput; // Reference to search input

document.getElementById('orderNowBtn').addEventListener('click', async () => {
    if (cart.length === 0) return;

    const order = {
        items: cart,
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        date: new Date().toISOString()
    };

    try {
        const response = await fetch('/place_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(order)
        });

        if (response.ok) {
            const result = await response.json();
            cart = [];
            updateCartDisplay();
            alert(`Order placed successfully!\nDaily Customer #${result.daily_customer_number}\nMonthly Customer #${result.monthly_customer_number}`);
            
            // Open kitchen display in new window if not already open
            window.open('/kitchen', 'kitchen_display', 'width=1200,height=800');
        } else {
            alert('Error placing order. Please try again.');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Error placing order. Please try again.');
    }
});

function updatePrice(itemName, currentPrice) {
    const newPrice = prompt(`Enter new price for ${itemName} (current: ₱${currentPrice}):`, currentPrice);
    
    if (newPrice === null) return; // User cancelled
    
    const numericPrice = parseFloat(newPrice);
    if (isNaN(numericPrice) || numericPrice <= 0) {
        alert('Please enter a valid price greater than 0');
        return;
    }

    fetch('/update_price', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            item_name: itemName,
            new_price: numericPrice
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Price updated successfully for ${itemName}`);
            loadItems(); // Refresh the display
        } else {
            alert('Error updating price');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating price');
    });
}

async function loadItems() {
    try {
        const response = await fetch('/get_orders/1');
        const items = await response.json();
        allItems = items; // Store all items
        
        // Initialize search input
        searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', handleSearch);
        
        displayFilteredItems(items); // Display all items initially
    } catch (error) {
        console.error('Error:', error);
    }
}

function addToCart(name, price, imagePath) {
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: name,
            price: price,
            imagePath: imagePath,
            quantity: 1
        });
    }
    
    updateCartDisplay();
}

function removeFromCart(index) {
    const item = cart[index];
    
    if (item.quantity > 1) {
        // If quantity is more than 1, decrease by 1
        item.quantity -= 1;
    } else {
        // If quantity is 1, remove the item completely
        cart.splice(index, 1);
    }
    
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    cartItems.innerHTML = cart.map((item, index) => `
        <tr class="cart-item" onclick="removeFromCart(${index})">
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₱${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = total.toFixed(2);

    const orderButton = document.getElementById('orderNowBtn');
    orderButton.disabled = cart.length === 0;
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredItems = allItems.filter(item => 
        item.item_name.toLowerCase().includes(searchTerm)
    );
    displayFilteredItems(filteredItems);
}

function displayFilteredItems(items) {
    const itemsList = document.getElementById('itemsList');
    const isPriceMode = document.getElementById('setPriceBtn').classList.contains('active');
    
    itemsList.innerHTML = items.map(item => `
        <tr class="menu-item" onclick="${isPriceMode ? 
            `updatePrice('${item.item_name}', ${item.price})` : 
            `addToCart('${item.item_name}', ${item.price}, '${item.image_path}')`}">
            <td><img src="/static/uploads/${item.image_path}" alt="${item.item_name}"></td>
            <td>${item.item_name}</td>
            <td>₱${item.price}</td>
        </tr>
    `).join('');
}

document.getElementById('setPriceBtn').addEventListener('click', function() {
    this.classList.toggle('active');
    if (this.classList.contains('active')) {
        this.style.backgroundColor = '#ff9800';
        alert('Price Set Mode: Click on an item to update its price');
    } else {
        this.style.backgroundColor = '';
    }
    displayFilteredItems(allItems);
});

document.getElementById('kitchenBtn').addEventListener('click', function(e) {
    e.preventDefault();
    window.open('/kitchen', 'kitchen_display', 'width=1200,height=800');
});

// Initialize the menu
loadItems();