// API Base URL (Render Server URL ချိတ်ဆက်ရန်)
const API_BASE_URL = "https://food-hub-eplq.onrender.com/api";

let allMenus = [];
let allShops = [];
let allDelis = [];
let allOptions = [];
let cart = [];
let currentSelectedItem = null;
let currentSelectedOptions = [];

// Page စတင်ဖွင့်ချိန်တွင် ဒေတာများ ဆွဲထုတ်ရန်
document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await fetchAllData();
}

// ဆာဗာမှ ဒေတာများ ရယူခြင်း
async function fetchAllData() {
    try {
        // 1. Menus ဆွဲထုတ်ရန်
        const menuRes = await fetch(`${API_BASE_URL}/menus`);
        const menuJson = await menuRes.json();
        allMenus = Array.isArray(menuJson) ? menuJson : (menuJson.data || []);

        // 2. Shops ဆွဲထုတ်ရန်
        const shopRes = await fetch(`${API_BASE_URL}/shops`);
        const shopJson = await shopRes.json();
        allShops = Array.isArray(shopJson) ? shopJson : (shopJson.data || []);

        // 3. Deli Services ဆွဲထုတ်ရန်
        try {
            const deliRes = await fetch(`${API_BASE_URL}/deli`);
            const deliJson = await deliRes.json();
            allDelis = Array.isArray(deliJson) ? deliJson : (deliJson.data || []);
            renderDelis(allDelis);
            populateDeliSelect(allDelis);
        } catch (err) {
            allDelis = [];
        }

        // 4. Options ဆွဲထုတ်ရန်
        try {
            const optRes = await fetch(`${API_BASE_URL}/menu-options`);
            const optJson = await optRes.json();
            allOptions = Array.isArray(optJson) ? optJson : (optJson.data || []);
        } catch (err) {
            allOptions = [];
        }

        // UI တွင် ဒေတာများ ဖော်ပြရန်
        renderMenus(allMenus);
        renderShops(allShops);

    } catch (error) {
        console.error("Data loading failed:", error);
        showErrorMessage();
    }
}

// Event Listeners ချိတ်ဆက်ခြင်း
function setupEventListeners() {
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    const cartBtn = document.getElementById("cartBtn");
    const closeCartBtn = document.getElementById("closeCartBtn");
    const submitOrderBtn = document.getElementById("submitOrderBtn");
    const closeShopBtn = document.getElementById("closeShopBtn");
    const closeShopBottomBtn = document.getElementById("closeShopBottomBtn");
    const deliSelect = document.getElementById("deliSelect");

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase().trim();
            if (clearSearchBtn) {
                clearSearchBtn.classList.toggle("hidden", keyword.length === 0);
            }
            filterMenusAndShops(keyword);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            clearSearchBtn.classList.add("hidden");
            renderMenus(allMenus);
            renderShops(allShops);
        });
    }

    if (cartBtn) {
        cartBtn.addEventListener("click", () => {
            document.getElementById("cartModal")?.classList.remove("hidden");
            renderCartList();
        });
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener("click", () => {
            document.getElementById("cartModal")?.classList.add("hidden");
        });
    }

    if (closeShopBtn) {
        closeShopBtn.addEventListener("click", () => {
            document.getElementById("shopModal")?.classList.add("hidden");
        });
    }

    if (closeShopBottomBtn) {
        closeShopBottomBtn.addEventListener("click", () => {
            document.getElementById("shopModal")?.classList.add("hidden");
        });
    }

    if (deliSelect) {
        deliSelect.addEventListener("change", updateCartTotals);
    }

    if (submitOrderBtn) {
        submitOrderBtn.addEventListener("click", submitOrder);
    }
}

// ရှာဖွေရန် (Search filtering)
function filterMenusAndShops(keyword) {
    const filteredMenus = allMenus.filter(item => 
        (item.name || item.title || "").toLowerCase().includes(keyword) ||
        (item.shop_name || "").toLowerCase().includes(keyword)
    );
    const filteredShops = allShops.filter(shop => 
        (shop.name || "").toLowerCase().includes(keyword)
    );
    renderMenus(filteredMenus);
    renderShops(filteredShops);
}

// "ထည့်မည်" နှိပ်တဲ့အခါ Option ပါမပါ စစ်ဆေးရန်
async function handleAddToCartClick(originalIndex) {
    playTapSound();
    const item = allMenus[originalIndex];
    if (!item) return;
    currentSelectedItem = item;

    let menuOptions = [];
    if (Array.isArray(allOptions) && allOptions.length > 0) {
        menuOptions = allOptions.filter(opt => String(opt.menu_id) === String(item.menu_id));
    }

    if (menuOptions.length === 0) {
        try {
            const res = await fetch(`${API_BASE_URL}/menu-options/${item.menu_id}`);
            const json = await res.json();
            const fetchedData = json.data || json;
            if (Array.isArray(fetchedData)) {
                menuOptions = fetchedData;
            }
        } catch (e) {
            menuOptions = [];
        }
    }

    if (menuOptions && menuOptions.length > 0) {
        openOptionModal(item, menuOptions);
    } else {
        addToCartDirectly(item);
    }
}

// UI Rendering Functions (မီနူးများကို Screen ပေါ်တွင် ပုံဖော်ပေးခြင်း)
function renderMenus(menus) {
    const container = document.getElementById("menuContainer");
    if (!container) return;
    
    if (!menus || menus.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-sm py-4'>မီနူး ဒေတာ မရှိသေးပါ။</p>";
        return;
    }

    container.innerHTML = menus.map((item, index) => `
        <div class="min-w-[160px] max-w-[160px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between snap-start flex-shrink-0 p-2.5">
            <div>
                <img src="${item.image_url || 'https://via.placeholder.com/150'}" alt="${item.name || item.title}" class="w-full h-28 object-cover rounded-xl mb-2">
                <h3 class="font-bold text-sm text-gray-800 truncate">${item.name || item.title}</h3>
                <p class="text-xs text-gray-500 truncate mb-1">${item.shop_name || ''}</p>
                <p class="text-[#B80D0D] font-extrabold text-sm">${item.price} ကျပ်</p>
            </div>
            <button onclick="handleAddToCartClick(${index})" class="mt-2.5 bg-[#B80D0D] hover:bg-red-700 text-white py-1.5 px-3 rounded-xl text-xs font-semibold transition w-full">
                ထည့်မည် 🛒
            </button>
        </div>
    `).join("");
}

// ဆိုင်များကို Screen ပေါ်တွင် ပုံဖော်ပေးခြင်း
function renderShops(shops) {
    const container = document.getElementById("shopContainer");
    if (!container) return;
    
    if (!shops || shops.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-sm py-4'>ဆိုင် ဒေတာ မရှိသေးပါ။</p>";
        return;
    }

    container.innerHTML = shops.map((shop) => `
        <div onclick="openShopDetail('${shop.shop_id || shop.id}', '${shop.name}')" class="min-w-[150px] max-w-[150px] bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col items-center text-center snap-start flex-shrink-0 cursor-pointer hover:shadow-md transition">
            <img src="${shop.image_url || 'https://via.placeholder.com/80'}" alt="${shop.name}" class="w-16 h-16 object-cover rounded-full mb-2 shadow-sm">
            <h3 class="font-bold text-xs text-gray-800 truncate w-full">${shop.name}</h3>
            <p class="text-[10px] text-gray-500 truncate w-full mt-0.5">${shop.address || 'မကွေး'}</p>
        </div>
    `).join("");
}

// Deli Services များကို Screen ပေါ်တွင် ပုံဖော်ပေးခြင်း
function renderDelis(delis) {
    const container = document.getElementById("deliContainer");
    if (!container) return;

    if (!delis || delis.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-sm py-4'>Deli Services များ မရှိသေးပါ။</p>";
        return;
    }

    container.innerHTML = delis.map(deli => `
        <div class="min-w-[150px] max-w-[150px] bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col items-center text-center snap-start flex-shrink-0">
            <img src="${deli.image_url || 'https://via.placeholder.com/80'}" alt="${deli.name}" class="w-14 h-14 object-cover rounded-full mb-2 shadow-sm">
            <h3 class="font-bold text-xs text-gray-800 truncate w-full">${deli.name}</h3>
            <p class="text-[10px] text-red-600 font-semibold mt-0.5">Deli ခ: ${deli.fee || 1000} ကျပ်</p>
        </div>
    `).join("");
}

function populateDeliSelect(delis) {
    const select = document.getElementById("deliSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Deli ရွေးပါ</option>' + delis.map(d => `
        <option value="${d.name}" data-fee="${d.fee || 1000}">${d.name} (${d.fee || 1000} ကျပ်)</option>
    `).join("");
}

// ဆိုင်အသေးစိတ်ဖွင့်ရန်
async function openShopDetail(shopId, shopName) {
    document.getElementById("shopModalTitle").innerText = shopName;
    document.getElementById("shopModal").classList.remove("hidden");
    const menuListContainer = document.getElementById("shopMenuList");
    menuListContainer.innerHTML = "<p class='text-gray-500 text-sm'>မီနူးများ ရှာဖွေနေပါသည်...</p>";

    const shopMenus = allMenus.filter(m => String(m.shop_id) === String(shopId) || m.shop_name === shopName);
    
    if (shopMenus.length === 0) {
        menuListContainer.innerHTML = "<p class='text-gray-500 text-sm'>ဤဆိုင်တွင် မီနူးများ မရှိသေးပါ။</p>";
        return;
    }

    menuListContainer.innerHTML = shopMenus.map((item) => {
        const globalIndex = allMenus.findIndex(m => m === item);
        return `
            <div class="min-w-[150px] max-w-[150px] bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex flex-col justify-between flex-shrink-0">
                <img src="${item.image_url || 'https://via.placeholder.com/150'}" class="w-full h-24 object-cover rounded-lg mb-2">
                <h4 class="font-bold text-xs text-gray-800 truncate">${item.name || item.title}</h4>
                <p class="text-red-600 font-bold text-xs mt-1">${item.price} ကျပ်</p>
                <button onclick="handleAddToCartClick(${globalIndex})" class="mt-2 bg-[#B80D0D] text-white py-1 rounded-lg text-[11px] font-semibold w-full">ထည့်မည်</button>
            </div>
        `;
    }).join("");
}

// Option Modal ဖွင့်ရန်
function openOptionModal(item, options) {
    document.getElementById("optionModalTitle").innerText = `${item.name || item.title} - Option ရွေးပါ`;
    const container = document.getElementById("optionListContainer");
    
    container.innerHTML = options.map((opt, idx) => `
        <label class="flex items-center justify-between p-2 border-b border-gray-100 text-sm cursor-pointer">
            <div class="flex items-center gap-2">
                <input type="radio" name="menuOption" value="${opt.id || idx}" data-name="${opt.name}" data-price="${opt.price || 0}" ${idx === 0 ? 'checked' : ''} class="text-[#B80D0D] focus:ring-[#B80D0D]">
                <span>${opt.name}</span>
            </div>
            <span class="text-gray-500 text-xs">+${opt.price || 0} ကျပ်</span>
        </label>
    `).join("");

    document.getElementById("optionModal").classList.remove("hidden");
}

function confirmOptionSelection() {
    const selectedRadio = document.querySelector('input[name="menuOption"]:checked');
    if (!selectedRadio) {
        alert("ကျေးဇူးပြု၍ Option တစ်ခုခု ရွေးချယ်ပါ။");
        return;
    }

    const optionName = selectedRadio.getAttribute("data-name");
    const optionPrice = parseFloat(selectedRadio.getAttribute("data-price")) || 0;

    addToCartWithOption(currentSelectedItem, { name: optionName, price: optionPrice });
    document.getElementById("optionModal").classList.add("hidden");
}

function addToCartDirectly(item) {
    cart.push({
        ...item,
        selectedOption: null,
        finalPrice: parseFloat(item.price) || 0,
        quantity: 1
    });
    updateCartCount();
    showToast("မုန့်ခြင်းထဲသို့ ထည့်ပြီးပါပြီ ✅");
}

function addToCartWithOption(item, option) {
    const finalPrice = (parseFloat(item.price) || 0) + option.price;
    cart.push({
        ...item,
        selectedOption: option,
        finalPrice: finalPrice,
        quantity: 1
    });
    updateCartCount();
    showToast("မုန့်ခြင်းထဲသို့ ထည့်ပြီးပါပြီ ✅");
}

function updateCartCount() {
    const countEl = document.getElementById("cartCount");
    if (countEl) {
        countEl.innerText = cart.length;
    }
}

function renderCartList() {
    const listEl = document.getElementById("cartList");
    if (!listEl) return;

    if (cart.length === 0) {
        listEl.innerHTML = "<p class='text-gray-500 text-xs text-center py-4'>မုန့်ခြင်းထဲတွင် ဘာမှမရှိသေးပါ။</p>";
        updateCartTotals();
        return;
    }

    listEl.innerHTML = cart.map((item, index) => `
        <div class="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 text-xs">
            <div>
                <p class="font-bold text-gray-800">${item.name || item.title}</p>
                ${item.selectedOption ? `<p class='text-gray-500 text-[10px]'>Option: ${item.selectedOption.name} (+${item.selectedOption.price} ကျပ်)</p>` : ''}
                <p class="text-red-600 font-semibold">${item.finalPrice} ကျပ်</p>
            </div>
            <button onclick="removeFromCart(${index})" class="text-gray-400 hover:text-red-600 font-bold px-2 py-1">✕</button>
        </div>
    `).join("");

    updateCartTotals();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    renderCartList();
}

function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.finalPrice, 0);
    
    const deliSelect = document.getElementById("deliSelect");
    let deliFee = 0;
    if (deliSelect && deliSelect.selectedOptions.length > 0) {
        const selectedOption = deliSelect.selectedOptions[0];
        deliFee = parseFloat(selectedOption.getAttribute("data-fee")) || 0;
    }

    const total = subtotal + deliFee;

    document.getElementById("subTotalAmount").innerText = `${subtotal} ကျပ်`;
    document.getElementById("deliFeeAmount").innerText = `${deliFee} ကျပ်`;
    document.getElementById("totalAmount").innerText = `${total} ကျပ်`;
}

// Order တင်ခြင်း (Submit Order)
async function submitOrder() {
    const name = document.getElementById("custName")?.value.trim();
    const phone = document.getElementById("custPhone")?.value.trim();
    const address = document.getElementById("custAddress")?.value.trim();
    const remark = document.getElementById("custRemark")?.value.trim() || "";
    const deliSelect = document.getElementById("deliSelect")?.value;

    if (!name || !phone || !address) {
        alert("ကျေးဇူးပြု၍ ဝယ်ယူသူ အမည်၊ ဖုန်းနံပါတ် နှင့် လိပ်စာ အပြည့်အစုံ ဖြည့်စွက်ပါ။");
        return;
    }

    if (cart.length === 0) {
        alert("မုန့်ခြင်းထဲတွင် ပစ္စည်းမရှိပါ။");
        return;
    }

    if (!deliSelect) {
        alert("ကျေးဇူးပြု၍ Deli ဝန်ဆောင်မှုတစ်ခု ရွေးချယ်ပါ။");
        return;
    }

    const orderData = {
        customer_name: name,
        phone: phone,
        address: address,
        remark: remark,
        deli_service: deliSelect,
        items: cart,
        total_amount: cart.reduce((sum, item) => sum + item.finalPrice, 0)
    };

    try {
        const res = await fetch(`${API_BASE_URL}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderData)
        });

        if (res.ok) {
            alert("မှာယူမှု အောင်မြင်ပါသည်။ ကျေးဇူးတင်ပါသည်။ 🙏");
            cart = [];
            updateCartCount();
            document.getElementById("cartModal")?.classList.add("hidden");
            // Input များကို ရှင်းလင်းရန်
            document.getElementById("custName").value = "";
            document.getElementById("custPhone").value = "";
            document.getElementById("custAddress").value = "";
            document.getElementById("custRemark").value = "";
        } else {
            alert("မှာယူမှု မအောင်မြင်ပါ။ ခဏနေ ပြန်ကြိုးစားပါ။");
        }
    } catch (error) {
        console.error("Order submission error:", error);
        alert("ဆာဗာချိတ်ဆက်မှု အမှားအယွင်း ရှိနေပါသည်။");
    }
}

function showErrorMessage() {
    const containers = ["menuContainer", "shopContainer", "deliContainer"];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = "<p class='text-red-500 text-sm p-4'>ဒေတာရယူ၍ မရပါ။ ကျေးဇူးပြု၍ ခဏနေ ပြန်ကြိုးစားပါ။</p>";
        }
    });
}

function playTapSound() {
    // Sound effect logic placeholder
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50 transition-all opacity-90";
    toast.style.zIndex = "9999";
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2000);
}