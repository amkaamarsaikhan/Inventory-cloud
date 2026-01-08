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
const storage = firebase.storage(); // Storage-г энд нэмлээ

let inventory = [];
let editId = null;
let currentImageData = ""; // Хуучин URL эсвэл Base64 хадгалах
let selectedFile = null;   // Шинээр сонгосон файл хадгалах

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

// ADD QTY Function
async function addItemQty(itemId, variantIndex) {
    const item = inventory.find(i => i.id === itemId);
    const qty = parseInt(item.variants[variantIndex].qty) || 0;
    await db.ref(`items/${itemId}/variants/${variantIndex}`).update({ qty: qty + 1 });
}

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
            const price = parseFloat(h.price) || 0;
            totalSales += price;
            return `<tr><td>${h.time}</td><td>${h.itemName || '未知'} (${h.color || '-'})</td><td align="right">¥${price.toLocaleString()}</td></tr>`;
        }).join("");

        const win = window.open("", "HistoryWindow", "width=800,height=800");
        if (!win) return alert("⚠️ 弹出窗口被拦截！");

        win.document.write(`
            <html><head><title>销售历史</title><style>
                body { font-family: sans-serif; padding: 20px; line-height: 1.5; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
                .total { background: #2563eb; color: white; padding: 8px 15px; border-radius: 8px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
                @media print { .no-print { display: none !important; } }
            </style></head><body>
            <div class="header"><h2>📜 销售历史</h2><div class="total">总计: ¥${totalSales.toLocaleString()}</div></div>
            <table><tr><th>时间</th><th>商品</th><th align="right">金额</th></tr>${rows}</table>
            <br><button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer;">🖨️ 打印 / PDF</button>
            </body></html>
        `);
        win.document.close();
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
                        <div class="action-btns">
                            <button class="add-qty-btn" onclick="addItemQty('${item.id}', ${idx})" style="background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; width:28px; height:28px;">+</button>
                            <button class="sell-btn" onclick="sellItem('${item.id}', ${idx})">💸 出售</button>
                        </div>
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

function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
}

function addVariantInput(color = "", qty = 0) {
    const div = document.createElement('div');
    div.className = 'variant-input-group';
    div.innerHTML = `
        <input type="text" placeholder="颜色" class="v-color" value="${color}">
        <div class="counter-box">
            <button type="button" onclick="changeQty(this, -1)">-</button>
            <input type="number" value="${qty}" class="v-qty">
            <button type="button" onclick="changeQty(this, 1)">+</button>
        </div>
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()" style="color: #ef4444; border: none; background: none; font-size: 18px; cursor: pointer;">✕</button>
    `;
    document.getElementById('variantInputs').appendChild(div);
}

function changeQty(btn, delta) {
    const input = btn.parentElement.querySelector('.v-qty');
    let val = (parseInt(input.value) || 0) + delta;
    input.value = val < 0 ? 0 : val;
}

// Зураг сонгох хэсэг - ШИНЭЧЛЭГДСЭН
document.getElementById('itemImage').onchange = (e) => {
    selectedFile = e.target.files[0]; // Файлыг санах ойд авна
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('preview').innerHTML = `<img src="${ev.target.result}" style="width:100%; border-radius:12px; margin-top:10px;">`;
        };
        reader.readAsDataURL(selectedFile);
    }
};

// Хадгалах функц - ШИНЭЧЛЭГДСЭН
async function saveItem() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const variants = Array.from(document.querySelectorAll('.variant-input-group')).map(div => ({
        color: div.querySelector('.v-color').value,
        qty: parseInt(div.querySelector('.v-qty').value) || 0
    })).filter(v => v.color);

    if (!name || isNaN(price)) return alert("请填写完整信息");

    let imageUrl = currentImageData;

    try {
        // Хэрэв шинэ зураг сонгосон бол Firebase Storage-руу хуулна
        if (selectedFile) {
            const storageRef = storage.ref(`items/${Date.now()}_${selectedFile.name}`);
            const snapshot = await storageRef.put(selectedFile);
            imageUrl = await snapshot.ref.getDownloadURL();
        }

        const data = { name, price, variants, image: imageUrl };

        if (editId) {
            await db.ref(`items/${editId}`).update(data);
        } else {
            await db.ref("items").push(data);
        }

        resetForm();
        toggleSidebar();
    } catch (err) {
        alert("Хадгалахад алдаа гарлаа: " + err.message);
    }
}

function resetForm() {
    document.getElementById('itemName').value = "";
    document.getElementById('itemPrice').value = "";
    document.getElementById('variantInputs').innerHTML = "";
    document.getElementById('preview').innerHTML = "";
    currentImageData = ""; 
    editId = null;
    selectedFile = null; // Файлыг цэвэрлэх
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

function deleteItem(id) { if (confirm("确定删除吗？")) db.ref(`items/${id}`).remove(); }
function login() { auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value, document.getElementById('loginPass').value).catch(e => alert(e.message)); }
function logout() { auth.signOut().then(() => window.location.reload()); }
function printInventory() { window.print(); }

addVariantInput();