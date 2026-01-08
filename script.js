// 1. Firebase Тохиргоо (Config хэвээрээ)
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
const auth = firebase.auth();
const db = firebase.database();

let inventory = [];
let historyData = [];
let editId = null;
let currentImageData = "";

// --- Sidebar & Dark Mode ---
function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// --- Dynamic Variant & Counter (Нэг мөрөнд компакт) ---
function addVariantInput(color = "", qty = 0) {
    const container = document.getElementById('variantInputs');
    const div = document.createElement('div');
    div.className = 'variant-input-group';

    // CSS-ийг JS-ээр болон Stylesheet-ээр давхар баталгаажуулав
    div.style.cssText = "display: flex; gap: 8px; align-items: center; margin-bottom: 10px;";

    div.innerHTML = `
        <input type="text" placeholder="颜色" class="v-color" value="${color}" style="flex: 2; margin-bottom: 0;">
        <div class="counter" style="flex: 1.2; display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; height: 36px; background: var(--card);">
            <button type="button" onclick="changeQty(this, -1)" style="width:30px; border:none; background:rgba(0,0,0,0.05); color:var(--text); cursor:pointer; font-weight:bold;">-</button>
            <input type="number" value="${qty}" class="v-qty" style="width:40px; border:none; text-align:center; margin:0; background:transparent; color:var(--text); -moz-appearance: textfield;">
            <button type="button" onclick="changeQty(this, 1)" style="width:30px; border:none; background:rgba(0,0,0,0.05); color:var(--text); cursor:pointer; font-weight:bold;">+</button>
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:red; cursor:pointer; font-size:18px;">✕</button>
    `;
    container.appendChild(div);
}

function changeQty(btn, delta) {
    const input = btn.parentElement.querySelector('.v-qty');
    let val = (parseInt(input.value) || 0) + delta;
    input.value = val < 0 ? 0 : val;
}

// --- Firebase Data Listeners ---
auth.onAuthStateChanged(user => {
    document.getElementById('loginSection').style.display = user ? 'none' : 'block';
    document.getElementById('addSection').style.display = user ? 'block' : 'none';
    render();
});

db.ref("items").on("value", snapshot => {
    const data = snapshot.val();
    inventory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    render();
});

db.ref("sales_history").on("value", snapshot => {
    const data = snapshot.val();
    historyData = data ? Object.values(data).reverse() : [];
});

// --- Борлуулалт (History нэмэх) ---
async function sellItem(itemId, variantIndex) {
    const item = inventory.find(i => i.id === itemId);
    if (!item || !item.variants[variantIndex]) return;

    if (item.variants[variantIndex].qty > 0) {
        const newQty = item.variants[variantIndex].qty - 1;
        const colorName = item.variants[variantIndex].color;

        await db.ref(`items/${itemId}/variants/${variantIndex}`).update({ qty: newQty });

        // Түүхэнд бичих
        await db.ref("sales_history").push({
            itemName: item.name,
            color: colorName,
            price: item.price,
            timestamp: Date.now()
        });
    } else {
        alert("库存不足！");
    }
}

// --- Render (Үндсэн Grid) ---
function render(data = inventory) {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = "";
    let grandTotal = 0;

    data.forEach(item => {
        const totalQty = item.variants.reduce((a, b) => a + (parseInt(b.qty) || 0), 0);
        grandTotal += (totalQty * item.price);

        const variantsHTML = item.variants.map((v, idx) => `
            <div class="variant-row">
                <span>${v.color}: <b>${v.qty}</b></span>
                <button class="sell-btn no-print" onclick="sellItem('${item.id}', ${idx})">💸 出售</button>
            </div>
        `).join("");

        const card = document.createElement('div');
        card.className = "card";
        card.innerHTML = `
            <img src="${item.image || 'https://via.placeholder.com/250x150'}">
            <div class="card-body">
                <h4>${item.name}</h4>
                <div class="variants-display">${variantsHTML}</div>
                  <span class="price">¥${(totalQty * item.price).toLocaleString()}</span>
                ${auth.currentUser ? `
                <div class="admin-controls no-print">
                    <button onclick="prepareEdit('${item.id}')">编辑</button>
                    <button onclick="deleteItem('${item.id}')" style="color:red;">删除</button>
                </div>` : ""}
            </div>
        `;
        grid.appendChild(card);
    });
    document.getElementById('total').innerText = "¥" + grandTotal.toLocaleString();
}

// --- Түүх харах ---
function showHistory() {
    const list = document.getElementById('historyList');
    
    // Нийт зарагдсан дүнг тооцоолох
    const totalSales = historyData.reduce((sum, h) => sum + (parseFloat(h.price) || 0), 0);

    // Цонхны доторх бүтцийг шинэчлэх (Гарчиг болон Нийт дүн)
    list.innerHTML = `
        <div class="history-header-summary">
            <h3>📜 销售历史 (History)</h3>
            <div class="sales-total-badge">
                <small>销售总额</small>
                <span>¥${totalSales.toLocaleString()}</span>
            </div>
        </div>
        <div id="historyItems">
            ${historyData.length ? historyData.map(h => `
                <div class="history-item">
                    <div>
                        <strong>${h.itemName}</strong> <small>(${h.color})</small><br>
                        <span class="history-date">${new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="history-price">+¥${h.price}</div>
                </div>
            `).join("") : "<p style='text-align:center; padding:20px;'>暂无销售记录</p>"}
        </div>
    `;
    document.getElementById('historyModal').style.display = 'block';
}

function closeHistory() { document.getElementById('historyModal').style.display = 'none'; }

// --- Бараа хадгалах (Add / Edit) ---
document.getElementById('itemImage').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        currentImageData = ev.target.result;
        document.getElementById('fileText').innerText = "✅ 已选择图片";
        document.getElementById('preview').innerHTML = `<img src="${currentImageData}" style="width:100%; margin-top:10px; border-radius:8px;">`;
    };
    reader.readAsDataURL(e.target.files[0]);
};

document.getElementById('addBtn').onclick = async () => {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);

    const variantInputs = document.querySelectorAll('.variant-input-group');
    const variants = Array.from(variantInputs).map(div => ({
        color: div.querySelector('.v-color').value.trim(),
        qty: parseInt(div.querySelector('.v-qty').value) || 0
    })).filter(v => v.color !== "");

    if (!name || isNaN(price) || variants.length === 0) return alert("信息不完整！");

    const data = { name, price, variants, image: currentImageData };

    try {
        if (editId) {
            await db.ref(`items/${editId}`).update(data);
            editId = null;
        } else {
            await db.ref("items").push(data);
        }
        resetForm();
        toggleSidebar();
    } catch (e) {
        alert("错误: " + e.message);
    }
};

function prepareEdit(id) {
    const item = inventory.find(i => i.id === id);
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;

    // Өнгөний хэсгийг цэвэрлээд шинийг нэмэх
    const container = document.getElementById('variantInputs');
    container.innerHTML = "";
    item.variants.forEach(v => addVariantInput(v.color, v.qty));

    currentImageData = item.image;
    document.getElementById('preview').innerHTML = `<img src="${currentImageData}" style="width:100%; border-radius:8px;">`;
    editId = id;
    document.getElementById('addBtn').innerText = "🆙 更新商品";
    toggleSidebar();
}

function resetForm() {
    document.getElementById('itemName').value = "";
    document.getElementById('itemPrice').value = "";
    document.getElementById('variantInputs').innerHTML = "";
    addVariantInput(); // Анхны хоосон мөр
    document.getElementById('preview').innerHTML = "";
    currentImageData = "";
    document.getElementById('fileText').innerText = "📸 选择图片";
    editId = null;
    document.getElementById('addBtn').innerText = "💾 保存商品";
}

// --- Бусад ---
function deleteItem(id) { if (confirm("确定要删除吗？")) db.ref(`items/${id}`).remove(); }

function searchItems() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    render(inventory.filter(i => i.name.toLowerCase().includes(q)));
}

function login() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert("登录失败: " + e.message));
}

function logout() { auth.signOut(); }

// Хамгийн анхны нүд
if (document.getElementById('variantInputs').innerHTML.trim() === "") addVariantInput();

// Theme шалгах
if (localStorage.getItem('theme') === 'dark') toggleDarkMode();