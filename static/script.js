// Cart state
let cart = [];
let allItems = []; // Store all items
let searchInput; // Reference to search input

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