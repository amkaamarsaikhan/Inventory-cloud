// Firebase 配置
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
let editId = null;
let currentImageData = "";

function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

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

// 出售商品：减少库存
async function sellItem(itemId, variantIndex) {
    const item = inventory.find(i => i.id === itemId);
    if (!item || !item.variants[variantIndex]) return;

    if (item.variants[variantIndex].qty > 0) {
        const newQty = item.variants[variantIndex].qty - 1;
        await db.ref(`items/${itemId}/variants/${variantIndex}`).update({ qty: newQty });
    } else {
        alert("库存不足！");
    }
}

function render(data = inventory) {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = "";
    let grandTotal = 0;

    data.forEach(item => {
        const totalQty = item.variants.reduce((a, b) => a + (parseInt(b.qty) || 0), 0);
        grandTotal += (totalQty * item.price);

        const variantsHTML = item.variants.map((v, idx) => `
            <div class="variant-row">
                <span style="font-size:11px;">${v.color}: <b>${v.qty}</b></span>
                <button class="sell-btn" onclick="sellItem('${item.id}', ${idx})">💸 出售</button>
            </div>
        `).join("");

        const card = document.createElement('div');
        card.className = "card";
        card.innerHTML = `
            <img src="${item.image || 'https://via.placeholder.com/250x150'}">
            <div class="card-body">
                <h4>${item.name}</h4>
                ${variantsHTML}
                <span class="price">$${(totalQty * item.price).toLocaleString()}</span>
                ${auth.currentUser ? `
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button onclick="prepareEdit('${item.id}')" style="flex:1; font-size:10px;">编辑</button>
                    <button onclick="deleteItem('${item.id}')" style="flex:1; font-size:10px; color:red;">删除</button>
                </div>` : ""}
            </div>
        `;
        grid.appendChild(card);
    });
    document.getElementById('total').innerText = "$" + grandTotal.toLocaleString();
}

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
    const colorInput = document.getElementById('itemColorName').value;

    if (!name || isNaN(price)) return alert("信息不完整！");

    const variants = colorInput.split(',').map(v => {
        const parts = v.split(':');
        return { color: parts[0].trim(), qty: parseInt(parts[1]) || 0 };
    });

    const data = { name, price, variants, image: currentImageData };
    try {
        if (editId) {
            await db.ref(`items/${editId}`).update(data);
            editId = null;
            document.getElementById('addBtn').innerText = "💾 保存商品";
        } else {
            await db.ref("items").push(data);
        }
        alert("操作成功！");
        resetForm();
    } catch (e) {
        alert("错误: " + e.message);
    }
};

function resetForm() {
    document.getElementById('itemName').value = "";
    document.getElementById('itemPrice').value = "";
    document.getElementById('itemColorName').value = "";
    document.getElementById('preview').innerHTML = "";
    currentImageData = "";
    document.getElementById('fileText').innerText = "📸 选择图片";
}

function prepareEdit(id) {
    const item = inventory.find(i => i.id === id);
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemColorName').value = item.variants.map(v => `${v.color}:${v.qty}`).join(",");
    currentImageData = item.image;
    editId = id;
    document.getElementById('addBtn').innerText = "🆙 更新商品";
    toggleSidebar();
}

function deleteItem(id) { if(confirm("确定要删除吗？")) db.ref(`items/${id}`).remove(); }
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

if (localStorage.getItem('theme') === 'dark') toggleDarkMode();