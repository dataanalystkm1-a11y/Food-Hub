const API_BASE_URL = 'https://wati-backend-api.onrender.com';

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let myOrderIds = JSON.parse(localStorage.getItem('myOrderIds')) || []; // မိမိဖုန်းထဲရှိ Order IDs
let allMenus = [];
let allShops = [];
let allDelis = [];

// Tap Vibration
function playTapSound() {
    if ("vibrate" in navigator) {
        navigator.vibrate(50);
    }
}

// Helpers
function getDriveDirectUrl(url) {
    if (!url) return 'https://via.placeholder.com/150';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
}

function getShopName(shopId) {
    const foundShop = allShops.find(s => String(s.shop_id) === String(shopId));
    return foundShop ? foundShop.shop_name : 'ဆိုင်နာမည်မရှိ';
}

function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.length;
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(item) {
    playTapSound();
    item.shop_name = getShopName(item.shop_id);
    cart.push(item);
    updateCartUI();
    alert(item.menu_name + " ကို မုန့်ခြင်းထဲ ထည့်လိုက်ပါပြီ!");
}

function removeFromCart(index) {
    playTapSound();
    cart.splice(index, 1);
    updateCartUI();
    openCartModal();
}

// Drag & Drop
function dragStart(event, index) {
    event.dataTransfer.setData('text/plain', index);
}

// Renders
function renderMenus(menusToRender) {
    const menuContainer = document.getElementById('menuContainer');
    if (menusToRender.length > 0) {
        menuContainer.innerHTML = menusToRender.map((item) => {
            const originalIndex = allMenus.findIndex(m => m.menu_id === item.menu_id);
            const imageUrl = getDriveDirectUrl(item.image_url);
            const currentShopName = getShopName(item.shop_id);
            return `
                <div draggable="true" ondragstart="dragStart(event, ${originalIndex})"
                     class="menu-card bg-white p-3 rounded-xl shadow flex flex-col justify-between">
                    <div>
                        <img src="${imageUrl}" class="w-full h-28 object-cover rounded-lg mb-2 bg-gray-200" onerror="this.src='https://via.placeholder.com/150'">
                        <h3 class="font-bold text-sm text-gray-800 line-clamp-1">${item.menu_name || 'မီနူးအမည်'}</h3>
                        <p class="text-xs text-[#B80D0D] font-medium mt-0.5 line-clamp-1">🏪 ${currentShopName}</p>
                    </div>
                    <div class="mt-2 flex items-center justify-between">
                        <span class="text-[#B80D0D] font-bold text-xs whitespace-nowrap">${item.price || 0} ကျပ်</span>
                        <button onclick='addToCart(allMenus[${originalIndex}])' class="bg-[#B80D0D] text-white text-xs px-2.5 py-1 rounded-lg hover:bg-red-700 font-medium">ထည့်မည်</button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        menuContainer.innerHTML = `<p class="text-gray-500 text-sm col-span-2 text-center py-6">ရှာဖွေထားသော မီနူး မရှိပါ။</p>`;
    }
}

function renderShops(shopsToRender) {
    const shopContainer = document.getElementById('shopContainer');
    if (shopsToRender.length > 0) {
        shopContainer.innerHTML = shopsToRender.map((shop) => {
            const shopImageUrl = getDriveDirectUrl(shop.shop_image_url);
            return `
                <div class="bg-white p-3 rounded-xl shadow text-center flex flex-col justify-between">
                    <div>
                        <img src="${shopImageUrl}" class="w-full h-24 object-cover rounded-lg mb-2 bg-gray-200" onerror="this.src='https://via.placeholder.com/150'">
                        <h3 class="font-bold text-sm text-gray-800 line-clamp-1">${shop.shop_name || 'ဆိုင်နာမည်'}</h3>
                    </div>
                    <button onclick="openShopModal('${shop.shop_name}', ${shop.shop_id})" class="text-[#B80D0D] text-xs border border-[#B80D0D] px-3 py-1 rounded-full mt-2 hover:bg-red-50 font-medium">ကြည့်ရန်</button>
                </div>
            `;
        }).join('');
    } else {
        shopContainer.innerHTML = `<p class="text-gray-500 text-sm col-span-2 text-center py-6">ရှာဖွေထားသော ဆိုင် မရှိပါ။</p>`;
    }
}

// Search Logic
function handleSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const clearBtn = document.getElementById('clearSearchBtn');

    if (query !== "") {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    const filteredMenus = allMenus.filter(menu => {
        const menuNameMatch = (menu.menu_name || '').toLowerCase().includes(query);
        const shopNameMatch = getShopName(menu.shop_id).toLowerCase().includes(query);
        return menuNameMatch || shopNameMatch;
    });

    const filteredShops = allShops.filter(shop => {
        return (shop.shop_name || '').toLowerCase().includes(query);
    });

    renderMenus(filteredMenus);
    renderShops(filteredShops);
}

function clearSearch() {
    playTapSound();
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    document.getElementById('clearSearchBtn').classList.add('hidden');
    renderMenus(allMenus);
    renderShops(allShops);
}

// Data Fetching (Shops & Menus from Render, Deli directly from Supabase to prevent 404)
async function loadDashboardData() {
    try {
        const [shopsRes, menusRes] = await Promise.all([
            fetch(`${API_BASE_URL}/shops`),
            fetch(`${API_BASE_URL}/menus`)
        ]);

        allShops = await shopsRes.json() || [];
        allMenus = await menusRes.json() || [];

        renderShops(allShops);
        renderMenus(allMenus);

        const deliContainer = document.getElementById('deliContainer');
        const deliSelect = document.getElementById('deliSelect');

        // Deli များကို Supabase ကနေ တိုက်ရိုက်ဆွဲထုတ်ခြင်း (Backend 404 Error ရှောင်ရန်)
        let deliData = [];
        try {
            const supabaseClient = window.supabase || supabase;
            if (supabaseClient && typeof supabaseClient.from === 'function') {
                const { data, error } = await supabaseClient.from('deli').select('*');
                if (!error) {
                    deliData = data || [];
                } else {
                    console.error("Supabase Deli Fetch Error:", error.message);
                }
            }
        } catch (supErr) {
            console.error("Supabase connection error:", supErr);
        }

        allDelis = deliData;

        if (allDelis.length > 0) {
            deliContainer.innerHTML = allDelis.map(deli => `
                <div class="bg-white p-3 rounded-xl shadow flex items-center justify-between">
                    <div>
                        <h4 class="font-bold text-sm text-gray-800">${deli.deli_name || 'Delivery'}</h4>
                        <p class="text-xs text-gray-500">${deli.price || 0} ကျပ်</p>
                    </div>
                    <span class="text-xs bg-red-100 text-[#B80D0D] px-2 py-1 rounded-md font-semibold">Active</span>
                </div>
            `).join('');

            deliSelect.innerHTML = `<option value="">Deli ရွေးပါ</option>` + allDelis.map(deli => `
                <option value="${deli.deli_id}" data-price="${deli.price || 0}">${deli.deli_name} - ${deli.price || 0} ကျပ်</option>
            `).join('');
        } else {
            deliContainer.innerHTML = `<p class="text-gray-500 text-sm col-span-2 text-center py-4">Deli မရှိသေးပါ။</p>`;
            deliSelect.innerHTML = `<option value="">Deli မရှိသေးပါ</option>`;
        }

    } catch (err) {
        console.error("Data Fetch Error:", err);
    }
}

// Modals
function openShopModal(shopName, shopId) {
    playTapSound();
    document.getElementById('shopModalTitle').innerText = shopName;
    const shopMenuList = document.getElementById('shopMenuList');
    const filteredMenus = allMenus.filter(m => String(m.shop_id) === String(shopId));

    if (filteredMenus.length > 0) {
        shopMenuList.innerHTML = filteredMenus.map(item => {
            const originalIndex = allMenus.findIndex(m => m.menu_id === item.menu_id);
            const imgUrl = getDriveDirectUrl(item.image_url);
            return `
                <div class="snap-start flex-shrink-0 w-36 bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-between shadow-sm">
                    <div>
                        <img src="${imgUrl}" class="w-full h-24 object-cover rounded-lg mb-2 bg-gray-200" onerror="this.src='https://via.placeholder.com/150'">
                        <h4 class="font-bold text-sm text-gray-800 line-clamp-1">${item.menu_name}</h4>
                        <p class="text-xs text-[#B80D0D] font-bold mt-1 whitespace-nowrap">${item.price || 0} ကျပ်</p>
                    </div>
                    <button onclick='addToCart(allMenus[${originalIndex}])' class="w-full bg-[#B80D0D] text-white text-xs py-1.5 rounded-lg mt-3 font-medium hover:bg-red-700 whitespace-nowrap">ထည့်မည်</button>
                </div>
            `;
        }).join('');
    } else {
        shopMenuList.innerHTML = `<p class="text-sm text-gray-500 text-center py-8 w-full">ဤဆိုင်တွင် မီနူးစာရင်း ထည့်သွင်းထားခြင်း မရှိသေးပါ။</p>`;
    }
    document.getElementById('shopModal').classList.remove('hidden');
}

function openCartModal() {
    playTapSound();
    const list = document.getElementById('cartList');
    const subTotalAmount = document.getElementById('subTotalAmount');

    if (cart.length === 0) {
        list.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">မုန့်ခြင်းထဲတွင် မီနူးများ မရှိသေးပါ။</p>`;
        subTotalAmount.innerText = "0 ကျပ်";
        document.getElementById('deliFeeAmount').innerText = "0 ကျပ်";
        document.getElementById('totalAmount').innerText = "0 ကျပ်";
    } else {
        let subTotal = 0;
        list.innerHTML = cart.map((item, index) => {
            subTotal += Number(item.price || 0);
            const currentShopName = item.shop_name || getShopName(item.shop_id);
            return `
                <div class="flex justify-between items-center text-sm border-b pb-1">
                    <div>
                        <span class="font-bold text-gray-800 line-clamp-1">${item.menu_name}</span>
                        <span class="text-xs text-[#B80D0D] font-medium block line-clamp-1">ဆိုင်: ${currentShopName}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[#B80D0D] font-semibold whitespace-nowrap">${item.price} ကျပ်</span>
                        <button onclick="removeFromCart(${index})" class="text-red-500 text-xs font-bold">ဖယ်မည်</button>
                    </div>
                </div>
            `;
        }).join('');
        subTotalAmount.innerText = subTotal.toLocaleString() + " ကျပ်";
        updateTotalWithDeli();
    }
    
    const lastCust = JSON.parse(localStorage.getItem('lastCustInfo')) || {};
    if (lastCust.name) document.getElementById('custName').value = lastCust.name;
    if (lastCust.phone) document.getElementById('custPhone').value = lastCust.phone;
    if (lastCust.address) document.getElementById('custAddress').value = lastCust.address;

    document.getElementById('cartModal').classList.remove('hidden');
}

function updateTotalWithDeli() {
    let subTotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const deliSelect = document.getElementById('deliSelect');
    const selectedOption = deliSelect.options[deliSelect.selectedIndex];
    let deliFee = selectedOption && selectedOption.dataset.price ? Number(selectedOption.dataset.price) : 0;

    document.getElementById('deliFeeAmount').innerText = deliFee.toLocaleString() + " ကျပ်";
    document.getElementById('totalAmount').innerText = (subTotal + deliFee).toLocaleString() + " ကျပ်";
}

// Local History Order Fetching
async function openOrdersModal() {
    playTapSound();
    const list = document.getElementById('myOrdersList');
    document.getElementById('ordersModal').classList.remove('hidden');

    if (myOrderIds.length === 0) {
        list.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">ဤဖုန်းမှ မှာယူထားသော အော်ဒါမှတ်တမ်း မရှိသေးပါ။</p>`;
        return;
    }

    list.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">အော်ဒါမှတ်တမ်းများ ရယူနေပါသည်...</p>`;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_ids: myOrderIds })
        });
        const data = await response.json();

        if (data && data.length > 0) {
            list.innerHTML = data.map(o => `
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-sm text-gray-800">Order #${o.order_id}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full font-bold ${o.order_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">${o.order_status || 'Pending'}</span>
                    </div>
                    <div class="text-xs text-gray-600 space-y-0.5">
                        <p>👤 ${o.customer_name} (${o.customer_phone})</p>
                        <p>📍 ${o.customer_address}</p>
                        <p class="font-bold text-[#B80D0D] mt-1">ကျသင့်ငွေ: ${Number(o.total_amount || 0).toLocaleString()} ကျပ်</p>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">အော်ဒါမှတ်တမ်းများ မတွေ့ရှိပါ။</p>`;
        }
    } catch (err) {
        console.error("Order fetch error:", err);
        list.innerHTML = `<p class="text-xs text-red-500 text-center py-6">အော်ဒါများ ရယူရာတွင် အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်။</p>`;
    }
}

async function checkoutOrder() {
    playTapSound();
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const deliSelect = document.getElementById('deliSelect');
    const deliId = deliSelect.value;
    const submitBtn = document.getElementById('submitOrderBtn');

    if (cart.length === 0 || !name || !phone || !address || !deliId) {
        alert("အချက်အလက်များကို အပြည့်အစုံ ဖြည့်ပေးပါရှင်။");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Order တင်နေပါသည်...";

        let subTotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
        const selectedOption = deliSelect.options[deliSelect.selectedIndex];
        let deliFee = Number(selectedOption.dataset.price || 0);

        const orderPayload = {
            customer_name: name,
            customer_phone: phone,
            customer_address: address,
            total_amount: subTotal + deliFee,
            deli_id: Number(deliId),
            order_status: 'Pending',
            items: cart.map(item => ({
                menu_id: item.menu_id,
                quantity: 1,
                price_at_order: Number(item.price || 0)
            }))
        };

        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Order error");

        const newOrderId = result.order_id;

        myOrderIds.push(newOrderId);
        localStorage.setItem('myOrderIds', JSON.stringify(myOrderIds));
        localStorage.setItem('lastCustInfo', JSON.stringify({ name, phone, address }));

        alert(`Order #${newOrderId} တင်ခြင်း အောင်မြင်ပါသည်။ ကျေးဇူးတင်ပါတယ်ရှင်!`);
        cart = [];
        updateCartUI();
        document.getElementById('cartModal').classList.add('hidden');

    } catch (err) {
        console.error("Order Error:", err);
        alert("Order တင်ရာတွင် အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်။");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Order တင်မည် (COD)";
    }
}

// Event Listeners Initialization
window.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    updateCartUI();

    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('clearSearchBtn').onclick = clearSearch;

    document.getElementById('cartBtn').onclick = openCartModal;
    document.getElementById('closeCartBtn').onclick = () => {
        playTapSound();
        document.getElementById('cartModal').classList.add('hidden');
    };
    document.getElementById('deliSelect').onchange = updateTotalWithDeli;
    document.getElementById('submitOrderBtn').onclick = checkoutOrder;

    const cartBtn = document.getElementById('cartBtn');
    cartBtn.addEventListener('dragover', (e) => e.preventDefault());
    cartBtn.addEventListener('drop', (e) => {
        e.preventDefault();
        const index = e.dataTransfer.getData('text/plain');
        if (index !== "" && allMenus[index]) {
            addToCart(allMenus[index]);
        }
    });

    document.getElementById('closeShopBtn').onclick = () => {
        playTapSound();
        document.getElementById('shopModal').classList.add('hidden');
    };
    document.getElementById('closeShopBottomBtn').onclick = () => {
        playTapSound();
        document.getElementById('shopModal').classList.add('hidden');
    };

    document.getElementById('ordersBtn').onclick = openOrdersModal;
    document.getElementById('closeOrdersBtn').onclick = () => {
        playTapSound();
        document.getElementById('ordersModal').classList.add('hidden');
    };
    document.getElementById('closeOrdersBottomBtn').onclick = () => {
        playTapSound();
        document.getElementById('ordersModal').classList.add('hidden');
    };

    document.addEventListener('contextmenu', event => event.preventDefault());
});