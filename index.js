let inventory = [];
let currentImg = "";
let editId = null;

// --- DARK MODE ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
}

// --- SIDEBAR ---
function toggleSidebar() {
    document.body.classList.toggle('sidebar-hidden');
    document.getElementById('toggleIcon').innerText = document.body.classList.contains('sidebar-hidden') ? '▶' : '◀';
}

// --- IMAGE HANDLING ---
document.getElementById('itemImage').onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const maxSize = 400; // Cloud-д зориулж хэмжээг бага зэрэг нэмэв
            let w = img.width, h = img.height;
            if (w > h) { h *= maxSize / w; w = maxSize; } else { w *= maxSize / h; h = maxSize; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            currentImg = canvas.toDataURL('image/jpeg', 0.5); // Чанарыг 0.5 болгож шахав
            document.getElementById('preview').innerHTML = `<img src="${currentImg}" style="width:100%; border-radius:8px;">`;
            document.getElementById('fileText').innerText = "✅ Image selected";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

// --- FIREBASE SAVE ---
document.getElementById('addBtn').onclick = function () {
    const name = document.getElementById('itemName').value;
    const price = Number(document.getElementById('itemPrice').value) || 0;
    const varText = document.getElementById('itemColorName').value;

    if (!name || !varText) return alert("Please fill in all required fields.");

    const variants = varText.split(',').map(v => {
        const p = v.split(':');
        return { color: p[0].trim(), qty: parseInt(p[1]) || 0 };
    });

    const itemData = { name, price, image: currentImg, variants };

    if (editId) {
        db.ref('inventory/' + editId).set(itemData);
        editId = null;
        document.getElementById('addBtn').innerText = "💾 Save";
    } else {
        db.ref('inventory').push(itemData);
    }
    resetForm();
};

// --- REAL-TIME DATA LOAD ---
window.onload = () => {
    db.ref('inventory').on('value', (snapshot) => {
        const data = snapshot.val();
        inventory = [];
        if (data) {
            Object.keys(data).forEach(key => {
                inventory.push({ id: key, ...data[key] });
            });
        }
        render();
    });
    if (localStorage.getItem('darkMode') === 'true') toggleDarkMode();
};

function render(data = inventory) {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = "";
    let grandTotal = 0;

    data.forEach((item) => {
        const totalQty = item.variants.reduce((a, b) => a + b.qty, 0);
        const itemTotal = totalQty * item.price;
        grandTotal += itemTotal;

        const card = document.createElement('div');
        card.className = "card";
        const badges = item.variants.map(v => `<span class="badge">${v.color}: ${v.qty}</span>`).join("");

        card.innerHTML = `
            <img src="${item.image || 'https://via.placeholder.com/250x150'}">
            <div class="card-body">
                <h4 style="margin:0 0 5px 0;">${item.name}</h4>
                <div>${badges}</div>
                <span class="price">$${itemTotal.toLocaleString()}</span>
                <div class="no-print" style="margin-top:12px; display:flex; gap:8px;">
                    <button onclick="editItem('${item.id}')" style="flex:1; padding:6px; cursor:pointer;">Fix</button>
                    <button onclick="deleteItem('${item.id}')" style="flex:1; padding:6px; cursor:pointer; color:red;">Delete</button>
                </div>
            </div>`;
        grid.appendChild(card);
    });
    document.getElementById('total').innerText = "$" + grandTotal.toLocaleString();
}

function resetForm() {
    document.getElementById('itemName').value = "";
    document.getElementById('itemPrice').value = "";
    document.getElementById('itemColorName').value = "";
    document.getElementById('preview').innerHTML = "";
    document.getElementById('fileText').innerText = "📸 Select image";
    currentImg = "";
}

window.deleteItem = (id) => { if (confirm("Delete?")) db.ref('inventory/' + id).remove(); };
window.editItem = (id) => {
    const it = inventory.find(i => i.id === id);
    document.getElementById('itemName').value = it.name;
    document.getElementById('itemPrice').value = it.price;
    document.getElementById('itemColorName').value = it.variants.map(v => `${v.color}:${v.qty}`).join(",");
    currentImg = it.image;
    editId = id;
    document.getElementById('addBtn').innerText = "🔄 Update";
    document.getElementById('preview').innerHTML = `<img src="${currentImg}" style="width:100%; border-radius:8px;">`;
    if (document.body.classList.contains('sidebar-hidden')) toggleSidebar();

};

function searchItems() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = inventory.filter(it => it.name.toLowerCase().includes(q));
    render(filtered);
}