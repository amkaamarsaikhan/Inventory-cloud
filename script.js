// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyC5mHmt15bTGhLiJQFebWdYujep3q2ndp8",
    authDomain: "inventory-8866.firebaseapp.com",
    databaseURL: "https://inventory-8866-default-rtdb.firebaseio.com",
    projectId: "inventory-8866",
    storageBucket: "inventory-8866.firebasestorage.app",
    messagingSenderId: "616659325542",
    appId: "1:616659325542:web:c5ea93e07f8af6bad153a7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let inventory = [];
let editId = null;
let currentImageData = "";

// Auth Logic
auth.onAuthStateChanged(user => {
    const loginSec = document.getElementById('loginSection');
    const adminSec = document.getElementById('adminSection');
    const grid = document.getElementById('inventoryGrid');

    if (user) {
        loginSec.style.display = 'none';
        adminSec.style.display = 'block';
        db.ref("items").on("value", snapshot => {
            const data = snapshot.val();
            inventory = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
            render();
        });
    } else {
        loginSec.style.display = 'block';
        adminSec.style.display = 'none';
        grid.innerHTML = `<div class="login-msg"><h1>🔒 请登录</h1><p>Нэвтэрч орж бараа материалаа удирдана уу.</p></div>`;
        document.getElementById('total').innerText = "¥0";
    }
});

function login() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert("Алдаа: " + e.message));
}

function logout() {
    if(confirm("Гарах уу?")) auth.signOut().then(() => window.location.reload());
}

// Sidebar & UI
function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
}

// Variant Logic
function addVariantInput(color = "", qty = 0) {
    const container = document.getElementById('variantInputs');
    const div = document.createElement('div');
    div.className = 'variant-input-group';
    div.innerHTML = `
        <input type="text" placeholder="颜色" class="v-color" value="${color}" style="flex:2; margin-bottom:0;">
        <div class="counter-box">
            <button type="button" onclick="changeQty(this, -1)">-</button>
            <input type="number" value="${qty}" class="v-qty" readonly>
            <button type="button" onclick="changeQty(this, 1)">+</button>
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="color:red; border:none; background:none; cursor:pointer;">✕</button>
    `;
    container.appendChild(div);
}

function changeQty(btn, delta) {
    const input = btn.parentElement.querySelector('.v-qty');
    let val = parseInt(input.value) + delta;
    input.value = val < 0 ? 0 : val;
}

// Render
function render() {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = "";
    let totalAssets = 0;

    inventory.forEach(item => {
        const variants = item.variants || [];
        const itemQty = variants.reduce((sum, v) => sum + (parseInt(v.qty) || 0), 0);
        totalAssets += itemQty * item.price;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${item.image || 'https://via.placeholder.com/300x160?text=No+Image'}">
            <div class="card-body">
                <h4>${item.name}</h4>
                ${variants.map((v, idx) => `
                    <div class="variant-row">
                        <span>${v.color}: <b>${v.qty}</b></span>
                        <button class="sell-btn" onclick="sellItem('${item.id}', ${idx})">💸 出售</button>
                    </div>
                `).join('')}
                <span class="price-tag">¥${(itemQty * item.price).toLocaleString()}</span>
                <div class="admin-controls">
                    <button onclick="prepareEdit('${item.id}')">编辑</button>
                    <button style="color:red" onclick="deleteItem('${item.id}')">删除</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    document.getElementById('total').innerText = "¥" + totalAssets.toLocaleString();
}

// Image handling
document.getElementById('itemImage').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        currentImageData = ev.target.result;
        document.getElementById('preview').innerHTML = `<img src="${currentImageData}" style="width:100%; border-radius:12px; margin-top:15px;">`;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// CRUD
async function saveItem() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const variants = Array.from(document.querySelectorAll('.variant-input-group')).map(div => ({
        color: div.querySelector('.v-color').value,
        qty: parseInt(div.querySelector('.v-qty').value)
    })).filter(v => v.color);

    if(!name || isNaN(price)) return alert("Мэдээллээ гүйцэд оруулна уу");

    const data = { name, price, variants, image: currentImageData };
    if(editId) await db.ref(`items/${editId}`).update(data);
    else await db.ref("items").push(data);
    
    resetForm(); toggleSidebar();
}

function resetForm() {
    document.getElementById('itemName').value = "";
    document.getElementById('itemPrice').value = "";
    document.getElementById('variantInputs').innerHTML = "";
    document.getElementById('preview').innerHTML = "";
    currentImageData = ""; editId = null;
    addVariantInput();
}

function prepareEdit(id) {
    const item = inventory.find(i => i.id === id);
    editId = id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('variantInputs').innerHTML = "";
    (item.variants || []).forEach(v => addVariantInput(v.color, v.qty));
    currentImageData = item.image;
    document.getElementById('preview').innerHTML = `<img src="${currentImageData}" style="width:100%; border-radius:12px;">`;
    toggleSidebar();
}

function deleteItem(id) { if(confirm("Устгах уу?")) db.ref(`items/${id}`).remove(); }

addVariantInput();