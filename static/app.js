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
    const container = document.getElementById