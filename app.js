// API Base URL (Render Server URL ချိတ်ဆက်ရန်)
const menuRes = await fetch(`${API_BASE_URL}/shop-portal/menus`);

let allMenus = [];
let allShops = [];
let allOptions = [];
let currentSelectedItem = null;

// Page စတင်ဖွင့်ချိန်တွင် ဒေတာများ ဆွဲထုတ်ရန်
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

        // 3. Options ဆွဲထုတ်ရန် (Error မတက်အောင် try-catch ခံထားသည်)
        try {
            const optRes = await fetch(`${API_BASE_URL}/options`);
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

    // allOptions သည် Array ဟုတ်မဟုတ် သေချာစစ်ဆေးပါ
    let menuOptions = [];
    if (Array.isArray(allOptions) && allOptions.length > 0) {
        menuOptions = allOptions.filter(opt => String(opt.menu_id) === String(item.menu_id));
    }

    if (menuOptions.length === 0) {
        try {
            const res = await fetch(`${API_BASE_URL}/options?menu_id=${item.menu_id}`);
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

// UI Rendering Functions (လိုအပ်ပါက သင့်မူလကုဒ်အတိုင်း ဆက်သုံးနိုင်ပါသည်)
function renderMenus(menus) {
    const container = document.getElementById("menu-container"); // ဥပမာ ID
    if (!container) return;
    
    if (menus.length === 0) {
        container.innerHTML = "<p>ဒေတာ မရှိသေးပါ</p>";
        return;
    }
    // မီနူးများ ဖော်ပြသည့် code များ...
}

function renderShops(shops) {
    const container = document.getElementById("shop-container"); // ဥပမာ ID
    if (!container) return;
    // ဆိုင်များ ဖော်ပြသည့် code များ...
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
    // Modal ဖွင့်ရန် logic
}

function addToCartDirectly(item) {
    // တိုက်ရိုက် Cart ထဲထည့်ရန် logic
}
// Page စဖွင့်တာနဲ့ API ကနေ ဒေတာတွေ ဆွဲထုတ်ရန် တိုက်ရိုက်ခေါ်ဆိုခြင်း
document.addEventListener("DOMContentLoaded", () => {
    if (typeof fetchAllData === "function") {
        fetchAllData();
    } else {
        // သင့်ရဲ့ မူလ ဒေတာဆွဲထုတ်သည့် Function နာမည်ကို ဒီမှာ ထည့်ပေးပါ
        // ဥပမာ - loadMenus(); loadShops();
        console.log("Fetching initial data...");
    }
});