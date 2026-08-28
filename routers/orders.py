import requests
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Any
from database import supabase

router = APIRouter(prefix="/orders", tags=["Orders"])

TELEGRAM_BOT_TOKEN = "8453664740:AAGiLC4MPpz7Ce_B2-UuZWHyK2TKA35Mj0Q" 
DELIVERY_CHAT_ID = "7295294892" 

def send_telegram_notification_with_button(chat_id: str, message: str, order_id: int):
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        print(f"Telegram Warning: Token or Chat ID is missing. (chat_id: {chat_id})")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "✅ Order အတည်ပြုပါသည်", "callback_data": f"confirm_{order_id}"}
            ]
        ]
    }

    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown",
        "reply_markup": keyboard
    }
    try:
        response = requests.post(url, json=payload)
        print(f"Telegram Response for Chat ID {chat_id}:", response.text)
    except Exception as e:
        print(f"Telegram Notification Error: {e}")

def send_telegram_notification(chat_id: str, message: str):
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Telegram Notification Error: {e}")

class OrderStatusUpdate(BaseModel):
    order_status: str

class BatchOrderRequest(BaseModel):
    order_ids: List[int]

@router.get("")
def get_all_orders():
    try:
        response = supabase.table("orders").select("*, order_items(*, menu(*)), deli(*)").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch")
async def get_batch_orders(request: Request):
    try:
        body = await request.json()
        order_ids = body.get("order_ids", [])
        
        if not order_ids:
            return []
            
        response = supabase.table("orders").select("*").in_("order_id", order_ids).execute()
        return response.data
    except Exception as e:
        print(f"Batch Orders Error: {str(e)}")
        return []

@router.post("")
async def create_order(request: Request):
    try:
        body = await request.json()
        print("====== RECEIVED FRONTEND ORDER DATA ======", body)

        items = body.get("items", [])
        print("Extracted Items:", items)

        menu_names_list = []
        for item in items:
            m_name = item.get("menu_name") or item.get("name") or item.get("title")
            if m_name:
                menu_names_list.append(str(m_name))
        
        combined_menu_names = ", ".join(menu_names_list) if menu_names_list else body.get("menu_name", "Menu")

        deli_id = body.get("deli_id") or body.get("deli")
        cust_name = body.get("customer_name") or body.get("name", "Customer")
        cust_phone = body.get("phone") or body.get("customer_phone", "-")
        cust_address = body.get("address") or body.get("customer_address", "-")
        cust_remark = body.get("customer_remark") or body.get("remark", "")
        total_price = body.get("total_price") or body.get("total_amount", 0)
        shop_name = body.get("shop_name", "ဆိုင်")
        deli_name = body.get("deli_name", "Deli")

        order_payload = {
            "customer_name": cust_name,
            "customer_phone": cust_phone,
            "customer_address": cust_address,
            "total_amount": total_price,
            "shop_name": shop_name,
            "deli_name": deli_name,
            "menu_name": combined_menu_names,
            "order_status": "Pending"
        }

        response = supabase.table("orders").insert(order_payload).execute()
        created_order = response.data[0] if response.data else {}
        order_id = created_order.get("order_id", "---")
        print(f"Created Order ID: {order_id}")

        shop_items_map = {} 

        if created_order and "order_id" in created_order and items:
            for item in items:
                menu_id = item.get("menu_id") or item.get("id")
                print(f"Processing item menu_id: {menu_id}")
                if not menu_id:
                    print("Skipping item because menu_id is missing.")
                    continue

                # ⚠️ မီနူး Active ဖြစ်မဖြစ် စစ်ဆေးခြင်း
                menu_check = supabase.table("menu").select("status, menu_name, shops(shop_id, shop_name, chat_id)").eq("menu_id", menu_id).execute()
                if menu_check.data:
                    menu_data = menu_check.data[0]
                    if menu_data.get("status") != "Active":
                        raise HTTPException(
                            status_code=400, 
                            detail=f"'{menu_data.get('menu_name', 'Item')}' မှာ လက်ရှိ ကုန်နေပါပြီ (Inactive ဖြစ်နေပါသည်)။"
                        )
                
                qty = int(item.get("quantity", 1))
                price = float(item.get("price", 0))

                item_payload = {
                    "order_id": order_id,
                    "menu_id": menu_id,
                    "quantity": qty,
                    "price": price
                }
                try:
                    supabase.table("order_items").insert(item_payload).execute()
                except Exception as sub_err:
                    print(f"Order Item Insert Error: {sub_err}")

                try:
                    if menu_check.data:
                        menu_data = menu_check.data[0]
                        shop_info = menu_data.get("shops") or {}
                        
                        if isinstance(shop_info, list) and len(shop_info) > 0:
                            shop_info = shop_info[0]

                        s_id = shop_info.get("shop_id")
                        s_name = shop_info.get("shop_name", shop_name)
                        s_chat_id = shop_info.get("chat_id")
                        
                        if s_id:
                            if s_id not in shop_items_map:
                                shop_items_map[s_id] = {
                                    "shop_name": s_name,
                                    "chat_id": s_chat_id,
                                    "items": []
                                }
                            shop_items_map[s_id]["items"].append({
                                "menu_name": menu_data.get("menu_name", item.get("menu_name", "Item")),
                                "quantity": qty,
                                "price": price
                            })
                except Exception as group_err:
                    print(f"Shop Grouping Error: {group_err}")

        # 🔔 Telegram မက်ဆေ့ချ် ပို့ခြင်း ပုံစံများ
        if shop_items_map:
            for s_id, s_data in shop_items_map.items():
                s_chat_id = s_data.get("chat_id")
                s_n = s_data.get("shop_name")
                s_itms = s_data.get("items", [])

                menu_lines = []
                shop_menu_total = 0
                for itm in s_itms:
                    line_total = itm["price"] * itm["quantity"]
                    shop_menu_total += line_total
                    menu_lines.append(f"- {itm['menu_name']} ({itm['quantity']} ခု) - {line_total:,.0f} ကျပ်")

                shop_menu_text = "\n".join(menu_lines) if menu_lines else combined_menu_names

                shop_msg = (
                    f"📦 *[Order အသစ်ဝင်ရောက်ပါသည်!]*\n"
                    f"🆔 အော်ဒာ ID: #{order_id}\n\n"
                    f"👤 ဝယ်ယူသူ: {cust_name}\n"
                    f"ဆိုင်: {s_n}\n"
                    f"မီနူးများ:\n{shop_menu_text}\n\n"
                    f"💰 ကျသင့်ငွေ (မီနူးစုစုပေါင်း): {shop_menu_total:,.0f} ကျပ်\n"
                    f"🛵 ရွေးချယ်ထားသော Deli: {deli_name}"
                )

                if s_chat_id:
                    send_telegram_notification_with_button(str(s_chat_id), shop_msg, order_id)
                else:
                    send_telegram_notification_with_button("5921089974", f"(Admin Fallback for {s_n})\n\n" + shop_msg, order_id)
        else:
            menu_total = sum(float(item.get("price", 0)) * int(item.get("quantity", 1)) for item in items) if items else float(total_price or 0)
            fallback_admin_msg = (
                f"📦 *[Order အသစ်ဝင်ရောက်ပါသည်!]*\n"
                f"🆔 အော်ဒာ ID: #{order_id}\n\n"
                f"👤 ဝယ်ယူသူ: {cust_name}\n"
                f"ဆိုင်: {shop_name}\n"
                f"မီနူး: {combined_menu_names}\n"
                f"💰 ကျသင့်ငွေ (မီနူးစုစုပေါင်း): {menu_total:,.0f} ကျပ်\n"
                f"🛵 ရွေးချယ်ထားသော Deli: {deli_name}"
            )
            send_telegram_notification_with_button("5921089974", fallback_admin_msg, order_id)

        deli_msg = (
            f"🛵 *[Delivery ပို့ရန် Order အသစ်!]*\n"
            f"🆔 အော်ဒာ ID: #{order_id}\n\n"
            f"ဝယ်ယူသူ: {cust_name}\n"
            f"ဖုန်းနံပါတ်: {cust_phone}\n"
            f"လိပ်စာ: {cust_address}\n"
            f"မှတ်ချက်: {cust_remark or 'မရှိပါ'}\n\n"
            f"ဆိုင်: {shop_name}\n"
            f"မီနူး: {combined_menu_names}\n"
            f"💵 ကောက်ခံရန်ငွေ: {float(total_price or 0):,.0f} ကျပ်"
        )
        send_telegram_notification(DELIVERY_CHAT_ID, deli_msg)

        return {
            "success": True, 
            "message": "Order created successfully", 
            "order_id": order_id, 
            "data": response.data
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Insert Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}/status")
def update_order_status(order_id: int, status_update: OrderStatusUpdate):
    try:
        response = supabase.table("orders").update({"order_status": status_update.order_status}).eq("order_id", order_id).execute()
        return {"message": "Order status updated successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))