// API Base URL (Render Server URL ချိတ်ဆက်ရန်)
const API_BASE_URL = "https://wati-backend-api.onrender.com";// Backend ရဲ့ Render URL 

let allMenus = [];
let allShops = [];
let allOptions = [];
let currentSelectedItem = null;

// Page စတင်ဖွင့်ချိန်တွင် ဒေတာများ ဆွဲထုတ်ရန် (တစ်ကြိမ်သာ ခေါ်ဆိုရန်)
document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
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

        // 3. Options ဆွဲထုတ်ရန်
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
    const container = document.getElementById("menu-container");
    if (!container) return;
    
    if (!menus || menus.length === 0) {
        container.innerHTML = "<p class='text-gray-500 p-4'>မီနူး ဒေတာ မရှိသေးပါ။</p>";
        return;
    }

    container.innerHTML = menus.map((item, index) => `
        <div class="bg-white rounded-xl shadow-md overflow-hidden p-4 flex flex-col justify-between">
            <div>
                <img src="${item.image_url || 'https://via.placeholder.com/150'}" alt="${item.name || item.title}" class="w-full h-32 object-cover rounded-lg mb-3">
                <h3 class="font-bold text-lg text-gray-800">${item.name || item.title}</h3>
                <p class="text-red-500 font-semibold mt-1">${item.price} ကျပ်</p>
            </div>
            <button onclick="handleAddToCartClick(${index})" class="mt-4 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition font-medium w-full">
                ထည့်မည် 🛒
            </button>
        </div>
    `).join("");
}

// ဆိုင်များကို Screen ပေါ်တွင် ပုံဖော်ပေးခြင်း
function renderShops(shops) {
    const container = document.getElementById("shop-container");
    if (!container) return;
    
    if (!shops || shops.length === 0) {
        container.innerHTML = "<p class='text-gray-500 p-4'>ဆိုင် ဒေတာ မရှိသေးပါ။</p>";
        return;
    }

    container.innerHTML = shops.map(shop => `
        <div class="bg-white rounded-xl shadow-md p-4 flex items-center space-x-4">
            <img src="${shop.image_url || 'https://via.placeholder.com/80'}" alt="${shop.name}" class="w-16 h-16 object-cover rounded-full">
            <div>
                <h3 class="font-bold text-md text-gray-800">${shop.name}</h3>
                <p class="text-sm text-gray-500">${shop.address || 'မြေနေရာ မရှိသေးပါ'}</p>
            </div>
        </div>
    `).join("");
}

function showErrorMessage() {
    document.querySelectorAll('.loading-text').forEach(el => {
        el.innerText = "ဒေတာရယူ၍ မရပါ။ ကျေးဇူးပြု၍ ခဏနေ ပြန်ကြိုးစားပါ။";
    });
}

function playTapSound() {
    // Sound effect logic (if any)
}

function openOptionModal(item, options) {
    console.log("Opening option modal for:", item.name, options);
}

function addToCartDirectly(item) {
    console.log("Added to cart directly:", item.name);
}