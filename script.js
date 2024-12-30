async function loadItems() {
    try {
        const response = await fetch('/get_orders/1');
        const items = await response.json();
        
        const itemsList = document.getElementById('itemsList');
        itemsList.innerHTML = items.map(item => `
            <tr>
                <td><img src="/static/uploads/${item.image_path}" alt="${item.item_name}"></td>
                <td>${item.item_name}</td>
                <td>₱${item.price}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

loadItems();