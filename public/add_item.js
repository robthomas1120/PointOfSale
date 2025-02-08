document.getElementById('addItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('item_name', document.getElementById('itemName').value);
    formData.append('price', document.getElementById('itemPrice').value);
    formData.append('image', document.getElementById('itemImage').files[0]);

    try {
        const response = await fetch('/add_order', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error:', error);
    }
});