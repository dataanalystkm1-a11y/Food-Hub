const API_BASE_URL = 'https://wati-backend-api.onrender.com';
const SUPABASE_STORAGE_URL = 'https://xdxyjcuqtajwdiunmahy.supabase.co/storage/v1/object/public/menu-images/';

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allMenus = [];
let allShops = [];
let allDelis = [];
let allOptions = []; 
let currentSelectedItem = null;

const FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

function playTapSound() {
    if ("vibrate" in navigator) {
        navigator.vibrate(50);
    }
}

function getDriveDirectUrl(url) {
    if (!url || url.trim() === "") return FALLBACK_IMAGE;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const fileId = urlParams.get('id');
        if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
        return url;
    }
    return SUPABASE_STORAGE_URL + url;
}

function getShopName(shopId) {
    const foundShop = allShops.find(s => String(s.shop_id) === String(shopId));
    return foundShop ? foundShop.shop_name : 'ဆိုင်နာမည်မရှိ';
}

function updateCartUI() {
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.innerText = cart.length;
    localStorage.setItem('cart', JSON.stringify(cart));
}

async function fetchLatestDataSilently() {
    try {
        const [shopsRes, menusRes] = await Promise.all([
            fetch(`${API_BASE_URL}/shops`),
            fetch(`${API_BASE_URL}/menus`)
        ]);
        const shopsJson = await shopsRes.json();
        const menusJson = await menusRes.json();

        allShops = shopsJson.data || shopsJson;
        allMenus = menusJson.data || menusJson;

        try {
            const optionsRes = await fetch(`${API_BASE_URL}/options`);
            const optionsJson = await optionsRes.json();
            allOptions = optionsJson.data || optionsJson;
        } catch (e) {
            allOptions = [];
        }
    } catch (err) {
        console.error("Silent Fetch Error:", err);
    }
}

// "ထည့်မည်" နှိပ်တဲ့အခါ Option ပါမပါ စစ်ဆေးရန်
async function handleAddToCartClick(originalIndex) {
    playTapSound();
    const item = allMenus[originalIndex];
    if (!item) return;
    currentSelectedItem = item;

    let menuOptions = allOptions.filter(opt => String(opt.menu_id) === String(item.menu_id));

    if (menuOptions.length === 0) {
        try {
            const res = await fetch(`${API_BASE_URL}/options?menu_id=${item.menu_id}`);
            const json = await res.json();
            menuOptions = json.data || json;
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

function openOptionModal(item, options) {
    const titleEl = document.getElementById('optionModalTitle');
    if (titleEl) titleEl.innerText = `${item.menu_name} - Option များ`;
    const container = document.getElementById('optionListContainer');
    if (!container) return;
    
    container.innerHTML = `
        <p class="text-xs text-gray-500 mb-2">ကျေးဇူးပြု၍ လိုအပ်သော Option ကို ရွေးချယ်ပါ -</p>
        <div class="space-y-2">
            ${options.map((opt, idx) => `
                <label class="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border cursor-pointer hover:bg-gray-100">
                    <input type="radio" name="menuOption" value="${opt.choice_name || opt.option_name}" data-price="${opt.additional_price || 0}" ${idx === 0 ? 'checked' : ''} class="text-[#B80D0D] focus:ring-[#B80D0D]">
                    <span>${opt.choice_name || opt.option_name}</span>
                    ${opt.additional_price && opt.additional_price > 0 ? `<span class="ml-auto text-xs text-[#B80D0D] font-semibold">(+${opt.additional_price} ကျပ်)</span>` : ''}
                </label>
            `).join('')}
        </div>
    `;
    
    const optionModal = document.getElementById('optionModal');
    if (optionModal) optionModal.classList.remove('hidden');
}

function confirmOptionSelection() {
    playTapSound();
    if (!currentSelectedItem) return;

    const selectedInput = document.querySelector('input[name="menuOption"]:checked');
    const selectedOptionText = selectedInput ? selectedInput.value : '';
    
    let additionalPrice = 0;
    if (selectedInput && selectedInput.dataset.price) {
        additionalPrice = Number(selectedInput.dataset.price);
    }

    let itemToAdd = { ...currentSelectedItem };
    itemToAdd.price = Number(itemToAdd.price || 0) + additionalPrice;

    if (selectedOptionText) {
        itemToAdd.menu_name = `${itemToAdd.menu_name} (${selectedOptionText})`;
    }

    addToCartDirectly(itemToAdd);
    const optionModal = document.getElementById('optionModal');
    if (optionModal) optionModal.classList.add('hidden');
}

function addToCartDirectly(item) {
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

function dragStart(event, index) {
    event.dataTransfer.setData('text/plain', index);
}

function renderMenus(menusToRender) {
    const menuContainer = document.getElementById('menuContainer');
    if (!menuContainer) return;
    if (menusToRender.length > 0) {
        menuContainer.innerHTML = menusToRender.map((item) => {
            const originalIndex = allMenus.findIndex(m => m.menu_id === item.menu_id);
            const imageUrl = getDriveDirectUrl(item.image_url);
            const currentShopName = getShopName(item.shop_id);
            return `
                <div draggable="true" ondragstart="dragStart(event, ${originalIndex})"
                     class="snap-start flex-shrink-0 w-40 bg-white p-3 rounded-xl shadow flex flex-col justify-between">
                    <div>
                        <img src="${imageUrl}" class="w-full h-28 object-cover rounded-lg mb-2 bg-gray-200" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
                        <h3 class="font-bold text-sm text-gray-800 line-clamp-1">${item.menu_name || 'မီနူးအမည်'}</h3>
                        <p class="text-xs text-[#B80D0D] font-medium mt-0.5 line-clamp-1">🏪 ${currentShopName}</p>
                    </div>
                    <div class="mt-2 flex items-center justify-between">
                        <span class="text-[#B80D0D] font-bold text-xs whitespace-nowrap">${item.price || 0} ကျပ်</span>
                        <button onclick='handleAddToCartClick(${originalIndex})' class="bg-[#B80D0D] text-white text-xs px-2.5 py-1 rounded-lg hover:bg-red-700 font-medium">ထည့်မည်</button>
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
    if (!shopContainer) return;
    if (shopsToRender.length > 0) {
        shopContainer.innerHTML = shopsToRender.map((shop) => {
            const shopImageUrl = getDriveDirectUrl(shop.shop_image_url);
            return `
                <div class="snap-start flex-shrink-0 w-36 bg-white p-3 rounded-xl shadow text-center flex flex-col justify-between">
                    <div>
                        <img src="${shopImageUrl}" class="w-full h-24 object-cover rounded-lg mb-2 bg-gray-200" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
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

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (!searchInput || !clearBtn) return;

    const query = searchInput.value.trim().toLowerCase();
    if (query !== "") clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');

    const filteredMenus = allMenus.filter(menu => {
        const menuNameMatch = (menu.menu_name || '').toLowerCase().includes(query);
        const shopNameMatch = getShopName(menu.shop_id).toLowerCase().includes(query);
        return menuNameMatch || shopNameMatch;
    });

    const filteredShops = allShops.filter(shop => (shop.shop_name || '').toLowerCase().includes(query));

    renderMenus(filteredMenus);
    renderShops(filteredShops);
}

function clearSearch() {
    playTapSound();
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    renderMenus(allMenus);
    renderShops(allShops);
}

async function loadDashboardData() {
    try {
        const [shopsRes, menusRes] = await Promise.all([
            fetch(`${API_BASE_URL}/shops`),
            fetch(`${API_BASE_URL}/menus`)
        ]);

        const shopsJson = await shopsRes.json();
        const menusJson = await menusRes.json();

        allShops = shopsJson.data || shopsJson;
        allMenus = menusJson.data || menusJson;

        renderShops(allShops);
        renderMenus(allMenus);

        try {
            const deliRes = await fetch(`${API_BASE_URL}/deli`);
            const deliJson = await deliRes.json();
            allDelis = deliJson.data || deliJson;

            const deliContainer = document.getElementById('deliContainer');
            const deliSelect = document.getElementById('deliSelect');

            if (allDelis.length > 0) {
                if (deliContainer) {
                    deliContainer.innerHTML = allDelis.map(deli => `
                        <div class="snap-start flex-shrink-0 w-44 bg-white p-3 rounded-xl shadow flex items-center justify-between">
                            <div>
                                <h4 class="font-bold text-sm text-gray-800 line-clamp-1">${deli.deli_name || 'Delivery'}</h4>
                                <p class="text-xs text-gray-500 mt-0.5">မြို့တွင်း: ${deli.fees || deli.price || 0} ကျပ်</p>
                            </div>
                            <span class="text-xs bg-red-100 text-[#B80D0D] px-2 py-1 rounded-md font-semibold whitespace-nowrap">Active</span>
                        </div>
                    `).join('');
                }

                if (deliSelect) {
                    deliSelect.innerHTML = `<option value="">Deli ရွေးပါ</option>` + allDelis.map(deli => `
                        <option value="${deli.deli_id}" data-price="${deli.fees || deli.price || 0}">${deli.deli_name} (မြို့တွင်း - ${deli.fees || deli.price || 0} ကျပ်)</option>
                    `).join('');
                }
            } else {
                if (deliContainer) deliContainer.innerHTML = `<p class="text-gray-500 text-sm col-span-2 text-center py-4">Deli မရှိသေးပါ။</p>`;
                if (deliSelect) deliSelect.innerHTML = `<option value="">Deli မရှိသေးပါ</option>`;
            }
        } catch (deliErr) {
            console.warn("Deli fetch warning:", deliErr);
        }

        try {
            const optionsRes = await fetch(`${API_BASE_URL}/options`);
            const optionsJson = await optionsRes.json();
            allOptions = optionsJson.data || optionsJson;
        } catch (optErr) {
            console.warn("Options fetch warning:", optErr);
            allOptions = [];
        }

    } catch (err) {
        console.error("Data Fetch Error:", err);
    }
}

async function openShopModal(shopName, shopId) {
    playTapSound();
    await fetchLatestDataSilently(); 
    
    const shopModalTitle = document.getElementById('shopModalTitle');
    if (shopModalTitle) shopModalTitle.innerText = shopName;

    const shopMenuList = document.getElementById('shopMenuList');
    if (!shopMenuList) return;

    const filteredMenus = allMenus.filter(m => String(m.shop_id) === String(shopId));

    if (filteredMenus.length > 0) {
        shopMenuList.innerHTML = filteredMenus.map(item => {
            const originalIndex = allMenus.findIndex(m => m.menu_id === item.menu_id);
            const imgUrl = getDriveDirectUrl(item.image_url);
            return `
                <div class="snap-start flex-shrink-0 w-36 bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-between shadow-sm">
                    <div>
                        <img src="${imgUrl}" class="w-full h-24 object-cover rounded-lg mb-2 bg-gray-200" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
                        <h4 class="font-bold text-sm text-gray-800 line-clamp-1">${item.menu_name}</h4>
                        <p class="text-xs text-[#B80D0D] font-bold mt-1 whitespace-nowrap">${item.price || 0} ကျပ်</p>
                    </div>
                    <button onclick='handleAddToCartClick(${originalIndex})' class="w-full bg-[#B80D0D] text-white text-xs py-1.5 rounded-lg mt-3 font-medium hover:bg-red-700 whitespace-nowrap">ထည့်မည်</button>
                </div>
            `;
        }).join('');
    } else {
        shopMenuList.innerHTML = `<p class="text-sm text-gray-500 text-center py-8 w-full">ဤဆိုင်တွင် Active ဖြစ်သော မီနူးစာရင်း မရှိသေးပါ။</p>`;
    }
    const shopModal = document.getElementById('shopModal');
    if (shopModal) shopModal.classList.remove('hidden');
}

async function openCartModal() {
    playTapSound();
    await fetchLatestDataSilently();

    const list = document.getElementById('cartList');
    const subTotalAmount = document.getElementById('subTotalAmount');
    if (!list || !subTotalAmount) return;

    if (cart.length === 0) {
        list.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">မုန့်ခြင်းထဲတွင် မီနူးများ မရှိသေးပါ။</p>`;
        subTotalAmount.innerText = "0 ကျပ်";
        const deliFeeAmount = document.getElementById('deliFeeAmount');
        const totalAmount = document.getElementById('totalAmount');
        if (deliFeeAmount) deliFeeAmount.innerText = "0 ကျပ်";
        if (totalAmount) totalAmount.innerText = "0 ကျပ်";
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
    const custName = document.getElementById('custName');
    const custPhone = document.getElementById('custPhone');
    const custAddress = document.getElementById('custAddress');
    const custRemark = document.getElementById('custRemark');

    if (custName && lastCust.name) custName.value = lastCust.name;
    if (custPhone && lastCust.phone) custPhone.value = lastCust.phone;
    if (custAddress && lastCust.address) custAddress.value = lastCust.address;
    if (custRemark && lastCust.remark) custRemark.value = lastCust.remark;

    const cartModal = document.getElementById('cartModal');
    if (cartModal) cartModal.classList.remove('hidden');
}

function updateTotalWithDeli() {
    let subTotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const deliSelect = document.getElementById('deliSelect');
    if (!deliSelect) return;
    const selectedOption = deliSelect.options[deliSelect.selectedIndex];
    let deliFee = selectedOption && selectedOption.dataset.price ? Number(selectedOption.dataset.price) : 0;

    const deliFeeAmount = document.getElementById('deliFeeAmount');
    const totalAmount = document.getElementById('totalAmount');
    if (deliFeeAmount) deliFeeAmount.innerText = deliFee.toLocaleString() + " ကျပ် (မြို့တွင်း)";
    if (totalAmount) totalAmount.innerText = (subTotal + deliFee).toLocaleString() + " ကျပ် (ခန့်မှန်း)";
}

async function checkoutOrder() {
    playTapSound();
    const nameEl = document.getElementById('custName');
    const phoneEl = document.getElementById('custPhone');
    const addressEl = document.getElementById('custAddress');
    const remarkEl = document.getElementById('custRemark');
    const deliSelect = document.getElementById('deliSelect');
    const submitBtn = document.getElementById('submitOrderBtn');

    if (!nameEl || !phoneEl || !addressEl || !deliSelect || !submitBtn) return;

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const address = addressEl.value.trim();
    const remark = remarkEl ? remarkEl.value.trim() : '';
    const deliId = deliSelect.value;

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

        const selectedDeliNameText = selectedOption ? selectedOption.text.split(' (')[0] : '';
        const menuNamesStr = cart.map(item => item.menu_name).join(', ');
        const shopNamesStr = [...new Set(cart.map(item => item.shop_name))].join(', ');

        const orderPayload = {
            customer_name: name,
            customer_phone: phone,
            customer_address: address,
            customer_remark: remark,
            total_amount: subTotal + deliFee,
            shop_name: shopNamesStr,
            deli_name: selectedDeliNameText,
            menu_name: menuNamesStr,
            deli_id: Number(deliId),
            order_status: 'Pending',
            items: cart.map(item => ({
                menu_id: item.menu_id,
                quantity: 1,
                price: Number(item.price || 0)
            }))
        };

        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Order error");

        let newOrderId = result.order_id || '---';
        localStorage.setItem('lastCustInfo', JSON.stringify({ name, phone, address, remark }));

        cart = [];
        updateCartUI();
        const cartModal = document.getElementById('cartModal');
        if (cartModal) cartModal.classList.add('hidden');

        showSuccessReceiptPopup({
            order_id: newOrderId,
            customer_name: name,
            customer_phone: phone,
            customer_address: address,
            customer_remark: remark,
            shop_name: shopNamesStr,
            menu_name: menuNamesStr,
            deli_name: selectedDeliNameText,
            sub_total: subTotal,
            deli_fee: deliFee,
            total_amount: subTotal + deliFee
        });

    } catch (err) {
        console.error("Order Error:", err);
        alert("Order တင်ရာတွင် အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်။");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Order တင်မည် (COD)";
    }
}

function showSuccessReceiptPopup(orderData) {
    let receiptModal = document.getElementById('successReceiptModal');
    if (!receiptModal) {
        receiptModal = document.createElement('div');
        receiptModal.id = 'successReceiptModal';
        receiptModal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4';
        document.body.appendChild(receiptModal);
    }

    receiptModal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border-t-4 border-[#B80D0D]">
            <div class="text-center mb-4">
                <div class="w-12 h-12 bg-red-100 text-[#B80D0D] rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">✓</div>
                <h3 class="text-lg font-bold text-gray-800">Order တင်ခြင်း အောင်မြင်ပါသည်။</h3>
                <p class="text-xs text-gray-500 mt-1">ကျေးဇူးတင်ပါတယ်ရှင်။ ဤအချက်အလက်များကို Screenshot ရိုက်သိမ်းထားပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။</p>
            </div>

            <div class="bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300 text-xs text-gray-700 space-y-1.5 mb-4">
                <div class="flex justify-between font-bold text-[#B80D0D]">
                    <span>Order ID:</span>
                    <span>#${orderData.order_id}</span>
                </div>
                <div class="flex justify-between">
                    <span>အမည်:</span>
                    <span class="font-medium">${orderData.customer_name} (${orderData.customer_phone})</span>
                </div>
                <div class="flex justify-between">
                    <span>လိပ်စာ:</span>
                    <span class="font-medium text-right max-w-[180px] line-clamp-2">${orderData.customer_address}</span>
                </div>
                ${orderData.customer_remark ? `
                <div class="flex justify-between text-red-600 bg-red-50 p-1 rounded">
                    <span class="font-semibold">မှတ်ချက်:</span>
                    <span class="font-medium text-right max-w-[180px]">${orderData.customer_remark}</span>
                </div>` : ''}
                <div class="border-t pt-1.5">
                    <p class="text-gray-500 font-semibold">ဆိုင်: ${orderData.shop_name}</p>
                    <p class="font-medium text-gray-800">မီနူး: ${orderData.menu_name}</p>
                </div>
                <div class="border-t pt-1.5 space-y-1">
                    <div class="flex justify-between">
                        <span>မုန့်ဖိုး စုစုပေါင်း:</span>
                        <span>${orderData.sub_total.toLocaleString()} ကျပ်</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Deli ခ (${orderData.deli_name}):</span>
                        <span>${orderData.deli_fee.toLocaleString()} ကျပ် <span class="text-[10px] text-gray-500">(မြို့တွင်း)</span></span>
                    </div>
                    <p class="text-[10px] text-[#B80D0D] italic mt-0.5">* မြို့ပြင်/ရပ်ကွက်အဝေးပိုင်းဖြစ်ပါက Deli ခ ထပ်မံပြောင်းလဲနိုင်ပြီး ဆိုင်ရှင်မှ ဖုန်းဖြင့် အတည်ပြုပါမည်။</p>
                    <div class="flex justify-between font-bold text-sm text-[#B80D0D] border-t pt-1">
                        <span>ကျသင့်ငွေ (ခန့်မှန်း):</span>
                        <span>${orderData.total_amount.toLocaleString()} ကျပ်</span>
                    </div>
                </div>
            </div>

            <button onclick="closeSuccessReceipt()" class="w-full bg-[#B80D0D] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition">
                သိရှိပြီးပါပြီ (ပိတ်မည်)
            </button>
        </div>
    `;
    receiptModal.classList.remove('hidden');
}

function closeSuccessReceipt() {
    playTapSound();
    const receiptModal = document.getElementById('successReceiptModal');
    if (receiptModal) receiptModal.classList.add('hidden');
}

window.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    updateCartUI();

    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const cartBtn = document.getElementById('cartBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const deliSelect = document.getElementById('deliSelect');
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const closeShopBtn = document.getElementById('closeShopBtn');
    const closeShopBottomBtn = document.getElementById('closeShopBottomBtn');

    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (clearSearchBtn) clearSearchBtn.onclick = clearSearch;

    if (cartBtn) cartBtn.onclick = openCartModal;
    if (closeCartBtn) {
        closeCartBtn.onclick = () => {
            playTapSound();
            const cartModal = document.getElementById('cartModal');
            if (cartModal) cartModal.classList.add('hidden');
        };
    }
    if (deliSelect) deliSelect.onchange = updateTotalWithDeli;
    if (submitOrderBtn) submitOrderBtn.onclick = checkoutOrder;

    if (cartBtn) {
        cartBtn.addEventListener('dragover', (e) => e.preventDefault());
        cartBtn.addEventListener('drop', (e) => {
            e.preventDefault();
            const index = e.dataTransfer.getData('text/plain');
            if (index !== "" && allMenus[index]) handleAddToCartClick(index);
        });
    }

    if (closeShopBtn) {
        closeShopBtn.onclick = () => {
            playTapSound();
            const shopModal = document.getElementById('shopModal');
            if (shopModal) shopModal.classList.add('hidden');
        };
    }
    if (closeShopBottomBtn) {
        closeShopBottomBtn.onclick = () => {
            playTapSound();
            const shopModal = document.getElementById('shopModal');
            if (shopModal) shopModal.classList.add('hidden');
        };
    }
});