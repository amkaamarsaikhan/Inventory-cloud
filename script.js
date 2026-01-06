// Firebase Setup
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
let currentImg = "";
let editId = null;

function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
}

function login() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(err => alert("登录失败: " + err.message));
}

function logout() {
    auth.signOut().then(() => toggleSidebar());
}

auth.onAuthStateChanged(user => {
    document.getElementById('loginSection').style.display = user ? 'none' : 'block';
    document.getElementById('addSection').style.display = user ? 'block' : 'none';
    render();
});

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
}

document.getElementById('itemImage').onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const maxSize = 500;
            let w = img.width, h = img.height;
            if (w > h) { h *= maxSize / w; w = maxSize; } else { w *= maxSize / h; h = maxSize; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            currentImg = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('preview').innerHTML = `<img src="${currentImg}" style="width:100%; border-radius:10px; margin-top:10px;">`;
            document.getElementById('fileText').innerText = "✅ 图片已就绪";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

document.getElementById('addBtn').onclick = function () {
    const name = document.getElementById('itemName').value;
    const price = Number(document.getElementById('itemPrice').value) || 0;
    const varText = document.getElementById('itemColorName').value;

    if (!name || !varText) return alert("请填写完整信息。");

    const variants = varText.split(',').map(v => {
        const p = v.split(':');
        return { color: p[0].trim(), qty: parseInt(p[1]) || 0 };
    });

    const itemData = { name, price, image: currentImg, variants };

    if (editId) {
        db.ref('inventory/' + editId).set(itemData).then(() => {
            alert("更新成功");
            editId = null;
            document.getElementById('addBtn').innerText = "💾 保存商品";
            toggleSidebar();
        });
    } else {
        db.ref('inventory').push(itemData).then(() => {
            alert("已添加");
            toggleSidebar();
        });
    }
    resetForm();
};

window.onload = () => {
    db.ref('inventory').on('value', (snapshot) => {
        const data = snapshot.val();
        inventory = [];
        if (data) {
            Object.keys(data).forEach(key => inventory.push({ id: key, ...data[key] }));
        }
        render();
    });
    if (localStorage.getItem('darkMode') === 'true') toggleDarkMode();
};

function render(data = inventory) {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = "";
    let grandTotal = 0;
    const isLogged = auth.currentUser != null;

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
                <h4>${item.name}</h4>
                <div>${badges}</div>
                <span class="price">$${itemTotal.toLocaleString()}</span>
                ${isLogged ? `
                <div style="margin-top:12px; display:flex; gap:5px;">
                    <button onclick="editItem('${item.id}')" style="flex:1; padding:7px; font-size:12px; border-radius:5px; border:1px solid #ddd;">编辑</button>
                    <button onclick="deleteItem('${item.id}')" style="flex:1; padding:7px; font-size:12px; border-radius:5px; border:1px solid #ddd; color:red;">删除</button>
                </div>` : ""}
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
    document.getElementById('fileText').innerText = "📸 选择图片";
    currentImg = "";
}

window.deleteItem = (id) => { if (confirm("确定要删除吗？")) db.ref('inventory/' + id).remove(); };

window.editItem = (id) => {
    const it = inventory.find(i => i.id === id);
    document.getElementById('itemName').value = it.name;
    document.getElementById('itemPrice').value = it.price;
    document.getElementById('itemColorName').value = it.variants.map(v => `${v.color}:${v.qty}`).join(",");
    currentImg = it.image;
    editId = id;
    document.getElementById('addBtn').innerText = "🔄 更新商品";
    document.getElementById('preview').innerHTML = `<img src="${currentImg}" style="width:100%; border-radius:10px;">`;
    toggleSidebar();
};

function searchItems() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = inventory.filter(it => it.name.toLowerCase().includes(q));
    render(filtered);
}