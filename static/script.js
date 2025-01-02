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
            // Clear the cart
            cart = [];
            updateCartDisplay();
            alert(`Order placed successfully!\nDaily Customer #${result.daily_customer_number}\nMonthly Customer #${result.monthly_customer_number}`);
            // Redirect to order history page
            window.location.href = '/order_history';
        } else {
            alert('Error placing order. Please try again.');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Error placing order. Please try again.');
    }
});

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
    itemsList.innerHTML = items.map(item => `
        <tr class="menu-item" onclick="addToCart('${item.item_name}', ${item.price}, '${item.image_path}')">
            <td><img src="/static/uploads/${item.image_path}" alt="${item.item_name}"></td>
            <td>${item.item_name}</td>
            <td>₱${item.price}</td>
        </tr>
    `).join('');
}

// Initialize the menu
loadItems();