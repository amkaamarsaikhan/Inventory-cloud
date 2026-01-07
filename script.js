// 1. Firebase 配置 (Firebase тохиргоо)
const firebaseConfig = {
  apiKey: "AIzaSyC5mHmt15bTGhLiJQFebWdYujep3q2ndp8",
  authDomain: "inventory-8866.firebaseapp.com",
  databaseURL: "https://inventory-8866-default-rtdb.firebaseio.com",
  projectId: "inventory-8866",
  storageBucket: "inventory-8866.firebasestorage.app",
  messagingSenderId: "616659325542",
  appId: "1:616659325542:web:c5ea93e07f8af6bad153a7",
  measurementId: "G-MGRGX96C99"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let inventory = [];
let editId = null;

// 2. Window Load - Хуудас ачаалагдах үед ажиллах
window.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    loadData();
    
    // Dark mode шалгах
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('modeIcon').innerText = '☀️';
    }
});

// --- UI CONTROL FUNCTIONS (Sidebar болон Dark Mode энд байна) ---

function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// 3. Authentication - Нэвтрэх төлөв хянах
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        const loginSection = document.getElementById('loginSection');
        const addSection = document.getElementById('addSection');
        
        if (user) {
            loginSection.style.display = 'none';
            addSection.style.display = 'block';
        } else {
            loginSection.style.display = 'block';
            addSection.style.display = 'none';
        }
        render(); // Эрхээс хамаарч Edit/Delete товч харуулах
    });
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    if (!email || !pass) { alert("请输入邮箱和密码"); return; }
    try {
        await auth.signInWithEmailAndPassword(email, pass);
        alert("登录成功！");
    } catch (e) { alert("错误: " + e.message); }
}

function logout() {
    auth.signOut().then(() => location.reload());
}

// 4. Data Operations - Өгөгдөлтэй ажиллах
function loadData() {
    db.ref("items").on("value", (snapshot) => {
        const data = snapshot.val();
        inventory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        render(inventory);
    });
}

function render(data = inventory) {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = "";
    let grandTotal = 0;
    const isLogged = auth.currentUser != null;

    data.forEach((item) => {
        const variants = item.variants || [];
        const totalQty = variants.reduce((sum, v) => sum + (parseInt(v.qty) || 0), 0);
        const itemTotal = totalQty * (parseFloat(item.price) || 0);
        grandTotal += itemTotal;

        const badges = variants.map(v => `<span class="badge">${v.color}: ${v.qty}</span>`).join("");

        const card = document.createElement('div');
        card.className = "card";
        card.innerHTML = `
            <img src="${item.image || 'https://via.placeholder.com/250x150'}">
            <div class="card-body">
                <h4>${item.name}</h4>
                <div>${badges}</div>
                <span class="price">$${itemTotal.toLocaleString()}</span>
                ${isLogged ? `
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button onclick="prepareEdit('${item.id}')" style="flex:1; padding:5px; font-size:11px; cursor:pointer; border-radius:4px; border:1px solid #ddd;">编辑 (Засах)</button>
                    <button onclick="deleteItem('${item.id}')" style="flex:1; padding:5px; font-size:11px; cursor:pointer; border-radius:4px; border:1px solid #ddd; color:red;">删除 (Устгах)</button>
                </div>` : ""}
            </div>
        `;
        grid.appendChild(card);
    });
    document.getElementById('total').innerText = "$" + grandTotal.toLocaleString();
}

// 5. Add & Update - Бараа нэмэх, шинэчлэх
document.getElementById('addBtn').onclick = async function() {
    const name = document.getElementById('itemName').value;
    const price = document.getElementById('itemPrice').value;
    const colorInput = document.getElementById('itemColorName').value;

    if (!name || !price) { alert("请填写信息"); return; }

    const variants = colorInput.split(',').map(v => {
        const parts = v.split(':');
        return { color: parts[0]?.trim() || "Default", qty: parseInt(parts[1]?.trim()) || 0 };
    });

    const itemData = { name, price: parseFloat(price), variants };

    try {
        if (editId) {
            await db.ref(`items/${editId}`).update(itemData);
            editId = null;
            document.getElementById('addBtn').innerText = "💾 保存商品";
        } else {
            await db.ref("items").push(itemData);
        }
        document.getElementById('itemName').value = "";
        document.getElementById('itemPrice').value = "";
        document.getElementById('itemColorName').value = "";
        alert("操作成功！");
    } catch (e) { alert("失败: " + e.message); }
};

function prepareEdit(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemColorName').value = item.variants.map(v => `${v.color}:${v.qty}`).join(",");
    editId = id;
    document.getElementById('addBtn').innerText = "Update";
    if (!document.body.classList.contains('sidebar-open')) toggleSidebar();
}

function deleteItem(id) {
    if (confirm("确定删除吗？")) db.ref(`items/${id}`).remove();
}

function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = inventory.filter(item => item.name.toLowerCase().includes(query));
    render(filtered);
}