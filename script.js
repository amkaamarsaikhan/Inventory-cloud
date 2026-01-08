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

// Auth State
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
        grid.innerHTML = `<div class="login-msg" style="text-align:center; padding:100px;"><h1>🔒 请登录</h1><p>请在菜单中登录以管理库存</p></div>`;
        document.getElementById('total').innerText = "¥0";
    }
});

// Sell Function
async function sellItem(itemId, variantIndex) {
    const item = inventory.find(i => i.id === itemId);
    const qty = parseInt(item.variants[variantIndex].qty);
    
    if (qty > 0) {
        const newQty = qty - 1;
        await db.ref(`items/${itemId}/variants/${variantIndex}`).update({ qty: newQty });
        await db.ref("history").push({
            itemName: item.name,
            color: item.variants[variantIndex].color,
            price: item.price,
            time: new Date().toLocaleString()
        });
    } else {
        alert("库存不足!");
    }
}

// History Function
function showHistory() {
    db.ref("history").once("value", snapshot => {
        const data = snapshot.val();
        if (!data) return alert("暂无销售记录");

        const historyArray = Object.values(data).reverse();
        let totalSales = 0;
        let rows = historyArray.map(h => {
            totalSales += parseFloat(h.price);
            return `<tr><td>${h.time}</td><td>${h.itemName} (${h.color})</td><td align="right">¥${h.price}</td></tr>`;
        }).join("");

        const win = window.open("", "History", "width=600,height=800");
        win.document.write(`
            <html><head><title>销售历史</title><style>
                body { font-family: sans-serif; padding: 20px; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                .total { background: #2563eb; color: white; padding: 10px; border-radius: 8px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
            </style></head><body>
            <div class="header"><h2>📜 销售历史</h2><div class="total">总计: ¥${totalSales.toLocaleString()}</div></div>
            <table><tr><th>时间</th><th>商品</th><th align="right">金额</th></tr>${rows}</table>
            </body></html>
        `);
    });
}

// Search
function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = inventory.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.variants && item.variants.some(v => v.color.toLowerCase().includes(query)))
    );
    render(filtered);
}

// Render
function render(data = inventory) {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = "";
    let totalAssets = 0;

    data.forEach(item => {
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

// CRUD & UI Helpers
function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }
function toggleDarkMode() { 
    const isDark = document.body.classList.toggle('dark-mode'); 
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
}

function addVariantInput(color = "", qty = 0) {
    const div = document.createElement('div');
    div.className = 'variant-input-group';
    div.innerHTML = `
        <input type="text" placeholder="颜色" class="v-color" value="${color}" style="flex:2;">
        <div class="counter-box">
            <button type="button" onclick="changeQty(this, -1)">-</button>
            <input type="number" value="${qty}" class="v-qty">
            <button type="button" onclick="changeQty(this, 1)">+</button>
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="color:red; border:none; background:none; cursor:pointer;">✕</button>
    `;
    document.getElementById('variantInputs').appendChild(div);
}

function changeQty(btn, delta) {
    const input = btn.parentElement.querySelector('.v-qty');
    let val = (parseInt(input.value) || 0) + delta;
    input.value = val < 0 ? 0 : val;
}

document.getElementById('itemImage').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        currentImageData = ev.target.result;
        document.getElementById('preview').innerHTML = `<img src="${currentImageData}" style="width:100%; border-radius:12px; margin-top:10px;">`;
    };
    reader.readAsDataURL(e.target.files[0]);
};

async function saveItem() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const variants = Array.from(document.querySelectorAll('.variant-input-group')).map(div => ({
        color: div.querySelector('.v-color').value,
        qty: parseInt(div.querySelector('.v-qty').value) || 0
    })).filter(v => v.color);

    if(!name || isNaN(price)) return alert("请填写完整信息");

    const data = { name, price, variants, image: currentImageData };
    editId ? await db.ref(`items/${editId}`).update(data) : await db.ref("items").push(data);
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
    currentImageData = item.image || "";
    document.getElementById('preview').innerHTML = currentImageData ? `<img src="${currentImageData}" style="width:100%; border-radius:12px;">` : "";
    toggleSidebar();
}

function deleteItem(id) { if(confirm("确定删除吗？")) db.ref(`items/${id}`).remove(); }
function login() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginPass').value).catch(e => alert(e.message)); }
function logout() { auth.signOut().then(() => window.location.reload()); }

addVariantInput();