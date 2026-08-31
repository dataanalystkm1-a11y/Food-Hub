// API Base URL (Render Server URL ချိတ်ဆက်ရန်)
const API_BASE_URL = "https://food-hub-eplq.onrender.com/api";

let allMenus = [];
let allShops = [];
let allDelis = [];
let allOptions = [];
let cart = [];
let currentSelectedItem = null;
let currentSelectedOptions = [];

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await fetchAllData();
}

async function fetchAllData() {
    try {
        const menuRes = await fetch(`${API_BASE_URL}/menus`);
        const menuJson = await menuRes.json();
        allMenus = Array.isArray(menuJson) ? menuJson : (menuJson.data || []);

        const shopRes = await fetch(`${API_BASE_URL}/shops`);
        const shopJson = await shopRes.json();
        allShops = Array.isArray(shopJson) ? shopJson : (shopJson.data || []);

        try {
            const deliRes = await fetch(`${API_BASE_URL}/deli`);
            const deliJson = await deliRes.json();
            allDelis = Array.isArray(deliJson) ? deliJson : (deliJson.data || []);
            renderDelis(allDelis);
            populateDeliSelect(allDelis);
        } catch (err) {
            allDelis = [];
        }

        try {
            const optRes = await fetch(`${API_BASE_URL}/menu-options`);
            const optJson = await optRes.json();
            allOptions = Array.isArray(optJson) ? optJson : (optJson.data || []);
        } catch (err) {
            allOptions = [];
        }

        renderMenus(allMenus);
        renderShops(allShops);

    } catch (error) {
        console.error("Data loading failed:", error);
        showErrorMessage();
    }
}

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

function filterMenusAndShops(keyword) {
    const filteredMenus = allMenus.filter(item => 
        (item.menu_name || item.name || item.title || "").toLowerCase().includes(keyword) ||
        (item.shop_name || "").toLowerCase().includes(keyword)
    );
    const filteredShops = allShops.filter(shop => 
        (shop.shop_name || shop.name || "").toLowerCase().includes(keyword)
    );
    renderMenus(filteredMenus);
    renderShops(filteredShops);
}

async function handleAddToCartClick(originalIndex) {
    playTapSound();
    const item = allMenus[originalIndex];
    if (!item) return;
    currentSelectedItem = item;

    const currentMenuId = String(item.menu_id || item.id);
    let menuOptions = [];

    if (Array.isArray(allOptions) && allOptions.length > 0) {
        menuOptions = allOptions.filter(opt => String(opt.menu_id) === currentMenuId);
    }

    if (menuOptions.length === 0) {
        try {
            const res = await fetch(`${API_BASE_URL}/menu-options/${currentMenuId}`);
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

function renderMenus(menus) {
    const container = document.getElementById("menuContainer");
    if (!container) return;
    
    if (!menus || menus.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-sm py-4'>မီနူး ဒေတာ မရှိသေးပါ။</p>";
        return;
    }

    container.innerHTML = menus.map((item, index) => {
        const itemName = item.menu_name || item.name || item.title || "အမည်မရှိ";
        const itemShop = item.shop_name || "";
        const itemPrice = item.price || 0;
        
        let itemImg = item.image_url || item.image || '';
        if (itemImg && !itemImg.startsWith('http')) {
            itemImg = `https://xdxyjcuqtajwdiunmahy.supabase.co/storage/v1/object/public/images/${itemImg}`;
        }

        return `
            <div class="min-w-[160px] max-w-[160px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between snap-start flex-shrink-0 p-2.5">
                <div>
                    <img src="${itemImg}" alt="${itemName}" class="w-full h-28 object-cover rounded-xl mb-2" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c'">
                    <h3 class="font-bold text-sm text-gray-800 truncate">${itemName}</h3>
                    <p class="text-xs text-gray-500 truncate mb-1">${itemShop}</p>
                    <p class="text-[#B80D0D] font-extrabold text-sm">${itemPrice} ကျပ်</p>
                </div>
                <button onclick="handleAddToCartClick(${index})" class="mt-2.5 bg-[#B80D0D] hover:bg-red-700 text-white py-1.5 px-3 rounded-xl text-xs font-semibold transition w-full">
                    ထည့်မည် 🛒
                </button>
            </div>
        `;
    }).join("");
}

function renderShops(shops) {
    const container = document.getElementById("shopContainer");
    if (!container) return;
    
    if (!shops || shops.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-sm py-4'>ဆိုင် ဒေတာ မရှိသေးပါ။</p>";
        return;
    }

    container.innerHTML = shops.map((shop) => {
        const shopName = shop.shop_name || shop.name || "ဆိုင်အမည်";
        const shopAddress = shop.address || "မကွေး";
        let shopImg = shop.image_url || shop.image || '';
        if (shopImg && !shopImg.startsWith('http')) {
            shopImg = `https://xdxyjcuqtajwdiunmahy.supabase.co/storage/v1/object/public/images/${shopImg}`;
        }
        const shopId = shop.shop_id || shop.id;

        return `
            <div onclick="openShopDetail('${shopId}', '${shopName}')" class="min-w-[150px] max-w-[150px] bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col items-center text-center snap-start flex-shrink-0 cursor-pointer hover:shadow-md transition">
                <img src="${shopImg}" alt="${shopName}" class="w-16 h-16 object-cover rounded-full mb-2 shadow-sm" onerror="this.src='https://images.unsplash.com/photo-1555396273-367ea4eb4db5'">
                <h3 class="font-bold text-xs text-gray-800 truncate w-full">${shopName}</h3>
                <p class="text-[10px] text-gray-500 truncate w-full mt-0.5">${shopAddress}</p>
            </div>
        `;
    }).join("");
}

function renderDelis(delis) {
    const container = document.getElementById("deliContainer");
    if (!container) return;

    if (!delis || delis.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-sm py-4'>Deli Services များ မရှိသေးပါ။</p>";
        return;
    }

    container.innerHTML = delis.map(deli => {
        const deliName = deli.name || "Deli";
        const deliFee = deli.fee || 1000;
        let deliImg = deli.image_url || deli.image || '';
        if (deliImg && !deliImg.startsWith('http')) {
            deliImg = `https://xdxyjcuqtajwdiunmahy.supabase.co/storage/v1/object/public/images/${deliImg}`;
        }

        return `
            <div class="min-w-[150px] max-w-[150px] bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col items-center text-center snap-start flex-shrink-0">
                <img src="${deliImg}" alt="${deliName}" class="w-14 h-14 object-cover rounded-full mb-2 shadow-sm" onerror="this.src='https://images.unsplash.com/photo-1526367790999-0150786686a2'">
                <h3 class="font-bold text-xs text-gray-800 truncate w-full">${deliName}</h3>
                <p class="text-[10px] text-red-600 font-semibold mt-0.5">Deli ခ: ${deliFee} ကျပ်</p>
            </div>
        `;
    }).join("");
}

function populateDeliSelect(delis) {
    const select = document.getElementById("deliSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Deli ရွေးပါ</option>' + delis.map(d => {
        const name = d.name || "Deli";
        const fee = d.fee || 1000;
        return `<option value="${name}" data-fee="${fee}">${name} (${fee} ကျပ်)</option>`;
    }).join("");
}

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
        const itemName = item.menu_name || item.name || item.title || "အမည်မရှိ";
        const itemPrice = item.price || 0;
        let itemImg = item.image_url || item.image || '';
        if (itemImg && !itemImg.startsWith('http')) {
            itemImg = `https://xdxyjcuqtajwdiunmahy.supabase.co/storage/v1/object/public/images/${itemImg}`;
        }

        return `
            <div class="min-w-[150px] max-w-[150px] bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex flex-col justify-between flex-shrink-0">
                <img src="${itemImg}" class="w-full h-24 object-cover rounded-lg mb-2" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c'">
                <h4 class="font-bold text-xs text-gray-800 truncate">${itemName}</h4>
                <p class="text-red-600 font-bold text-xs mt-1">${itemPrice} ကျပ်</p>
                <button onclick="handleAddToCartClick(${globalIndex})" class="mt-2 bg-[#B80D0D] text-white py-1 rounded-lg text-[11px] font-semibold w-full">ထည့်မည်</button>
            </div>
        `;
    }).join("");
}

function openOptionModal(item, options) {
    const itemName = item.menu_name || item.name || item.title || "";
    document.getElementById("optionModalTitle").innerText = `${itemName} - Option ရွေးပါ`;
    const container = document.getElementById("optionListContainer");
    
    container.innerHTML = options.map((opt, idx) => {
        const choiceName = opt.choice_name || opt.name || "Option";
        const addPrice = opt.additional_price !== undefined ? opt.additional_price : (opt.price || 0);
        const optId = opt.option_id || opt.id || idx;

        return `
            <label class="flex items-center justify-between p-2 border-b border-gray-100 text-sm cursor-pointer">
                <div class="flex items-center gap-2">
                    <input type="radio" name="menuOption" value="${optId}" data-name="${choiceName}" data-price="${addPrice}" ${idx === 0 ? 'checked' : ''} class="text-[#B80D0D] focus:ring-[#B80D0D]">
                    <span>${choiceName}</span>
                </div>
                <span class="text-gray-500 text-xs">+${addPrice} ကျပ်</span>
            </label>
        `;
    }).join("");

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

    listEl.innerHTML = cart.map((item, index) => {
        const itemName = item.menu_name || item.name || item.title || "အမည်မရှိ";
        return `
            <div class="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 text-xs">
                <div>
                    <p class="font-bold text-gray-800">${itemName}</p>
                    ${item.selectedOption ? `<p class='text-gray-500 text-[10px]'>Option: ${item.selectedOption.name} (+${item.selectedOption.price} ကျပ်)</p>` : ''}
                    <p class="text-red-600 font-semibold">${item.finalPrice} ကျပ်</p>
                </div>
                <button onclick="removeFromCart(${index})" class="text-gray-400 hover:text-red-600 font-bold px-2 py-1">✕</button>
            </div>
        `;
    }).join("");

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

function playTapSound() {}

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