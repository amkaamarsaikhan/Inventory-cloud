// Sidebar-г нээх хаах
function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
}

// Dark Mode сэлгэх
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('modeIcon').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Хуудас ачаалагдахад Dark Mode-г шалгах
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('modeIcon').innerText = '☀️';
    }
});

// Барааг харуулж буй функц (Dark mode-д зохицсон)
function render(data = inventory) {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = "";
    let grandTotal = 0;
    const isLogged = firebase.auth().currentUser != null;

    data.forEach((item) => {
        const totalQty = item.variants.reduce((a, b) => a + (parseInt(b.qty) || 0), 0);
        const itemTotal = totalQty * (item.price || 0);
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
                ${isLogged ? `
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button onclick="editItem('${item.id}')" style="flex:1; padding:5px; font-size:11px; border-radius:4px; border:1px solid #ddd;">编辑</button>
                    <button onclick="deleteItem('${item.id}')" style="flex:1; padding:5px; font-size:11px; border-radius:4px; border:1px solid #ddd; color:red;">删除</button>
                </div>` : ""}
            </div>`;
        grid.appendChild(card);
    });
    document.getElementById('total').innerText = "$" + grandTotal.toLocaleString();
}

// Бусад Firebase функцүүд хэвээр үлдэнэ...