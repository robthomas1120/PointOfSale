// Cart state
let cart = [];
let allItems = []; // Store all items
let searchInput; // Reference to search input

document.getElementById('orderNowBtn').addEventListener('click', async () => {
    if (cart.length === 0) return;

    const originalTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountedTotal = cart.reduce((sum, item) => {
        if (item.discounted) {
            const regularItems = item.quantity - 1;
            const discountedItem = 1;
            return sum + (item.price * regularItems) + (item.price * discountedItem * 0.8);
        }
        return sum + (item.price * item.quantity);
    }, 0);

    const order = {
        items: cart.map(item => ({
            ...item,
            originalPrice: item.price * item.quantity,
            discountedPrice: item.discounted ? 
                (item.price * (item.quantity - 1)) + (item.price * 0.8) :
                item.price * item.quantity
        })),
        totalAmount: originalTotal,
        discountedTotal: discountedTotal,
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
            quantity: 1,
            discounted: false
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
    const discountedTotal = document.getElementById('discountedTotal');
    
    cartItems.innerHTML = cart.map((item, index) => `
        <tr class="cart-item">
            <td>
                <div class="item-discount-group">
                    <input type="checkbox" 
                           id="discount-${index}" 
                           class="discount-checkbox"
                           ${item.discounted ? 'checked' : ''}
                           onchange="toggleDiscount(${index})"
                    >
                    <label for="discount-${index}">${item.name}</label>
                </div>
            </td>
            <td>${item.quantity}</td>
            <td onclick="removeFromCart(${index})">₱${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');
    
    // Calculate totals
    const originalTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountedItems = cart.reduce((sum, item) => {
        if (item.discounted) {
            // Apply 20% discount to only one item of the quantity
            const regularItems = item.quantity - 1;
            const discountedItem = 1;
            return sum + (item.price * regularItems) + (item.price * discountedItem * 0.8);
        }
        return sum + (item.price * item.quantity);
    }, 0);
    
    cartTotal.textContent = originalTotal.toFixed(2);
    discountedTotal.textContent = discountedItems.toFixed(2);

    const orderButton = document.getElementById('orderNowBtn');
    orderButton.disabled = cart.length === 0;
}

function toggleDiscount(index) {
    // Check if any other item is already discounted
    const hasExistingDiscount = cart.some((item, idx) => idx !== index && item.discounted);
    
    // Get the checkbox that was clicked
    const checkbox = document.getElementById(`discount-${index}`);
    
    // If trying to check a box when another is already checked
    if (!cart[index].discounted && hasExistingDiscount) {
        // Uncheck the box that was just clicked
        checkbox.checked = false;
        // Show warning
        alert("Warning: Only one item can be discounted at a time. Please uncheck the existing discounted item first.");
        return;
    }
    
    // If we get here, either we're unchecking a box or we're checking the first box
    cart[index].discounted = checkbox.checked;
    updateCartDisplay();
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