import requests
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Any
from database import supabase

router = APIRouter(prefix="/orders", tags=["Orders"])

# --- Telegram Bot Configuration ---
TELEGRAM_BOT_TOKEN = "8453664740:AAGiLC4MPpz7Ce_B2-UuZWHyK2TKA35Mj0Q"  # နွေးရဲ့ Bot Token
ADMIN_CHAT_ID = "5921089974"             # ဆိုင်ရှင် Chat ID
DELIVERY_CHAT_ID = "7295294892"          # Deli Team Chat ID

def send_telegram_notification(chat_id: str, message: str):
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        print("Telegram Warning: Token or Chat ID is missing.")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message
        # Plain text အနေနဲ့ ပို့ပေးမည် (Formatting error ကင်းစေရန်)
    }
    try:
        response = requests.post(url, json=payload)
        print(f"Telegram Response for {chat_id}:", response.text)
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
        print("Received Frontend Data:", body)

        items = body.get("items", [])
        menu_names_list = []
        for item in items:
            m_name = item.get("menu_name") or item.get("name") or item.get("title")
            if m_name:
                menu_names_list.append(str(m_name))
        
        combined_menu_names = ", ".join(menu_names_list) if menu_names_list else body.get("menu_name")

        # deli_id ကို frontend က ပို့လာသည်များကို ဖမ်းယူခြင်း
        deli_id = body.get("deli_id") or body.get("deli")

        cust_name = body.get("customer_name") or body.get("name")
        cust_phone = body.get("phone") or body.get("customer_phone")
        cust_address = body.get("address") or body.get("customer_address")
        cust_remark = body.get("customer_remark") or body.get("remark", "")
        total_price = body.get("total_price") or body.get("total_amount")
        shop_name = body.get("shop_name", "ဆိုင်")
        deli_name = body.get("deli_name", "Deli")

        order_payload = {
            "customer_name": cust_name,
            "customer_phone": cust_phone,
            "customer_address": cust_address,
            "total_amount": total_price,
            "shop_name": shop_name,
            "deli_name": deli_name,
            "deli_id": deli_id,
            "menu_name": combined_menu_names,
            "order_status": "Pending"
        }

        response = supabase.table("orders").insert(order_payload).execute()
        
        created_order = response.data[0] if response.data else {}
        order_id = created_order.get("order_id", "---")

        if created_order and "order_id" in created_order and items:
            for item in items:
                menu_id = item.get("menu_id") or item.get("id")
                if not menu_id:
                    continue

                item_payload = {
                    "order_id": order_id,
                    "menu_id": menu_id,
                    "quantity": item.get("quantity", 1),
                    "price": item.get("price", 0)
                }
                try:
                    supabase.table("order_items").insert(item_payload).execute()
                except Exception as sub_err:
                    print(f"Order Item Insert Error: {sub_err}")

        # --- ဆိုင်အတွက် မီနူးတန်ဖိုး စုစုပေါင်း တွက်ချက်ခြင်း (Deli ခ မပါ) ---
        menu_total = sum(float(item.get("price", 0)) * int(item.get("quantity", 1)) for item in items) if items else float(total_price or 0)

        # 🔔 Telegram Notifications ပို့ခြင်း
        
        # 1. ဆိုင်ရှင် (Admin) ဘက်သို့ (Customer နာမည်ပါမည်၊ ဖုန်း/လိပ်စာမပါ၊ Deli ခမပါဘဲ မီနူး Total သီးသန့်ပါမည်)
        admin_msg = (
            f"[Order အသစ်ဝင်ရောက်ပါသည်! #ID: {order_id}]\n\n"
            f"👤 ဝယ်ယူသူ: {cust_name}\n"
            f"ဆိုင်: {shop_name}\n"
            f"မီနူး: {combined_menu_names}\n"
            f"ကျသင့်ငွေ (မီနူးစုစုပေါင်း): {menu_total:,.0f} ကျပ်\n"
            f"ရွေးချယ်ထားသော Deli: {deli_name}"
        )
        send_telegram_notification(ADMIN_CHAT_ID, admin_msg)

        # 2. Delivery ဘက်သို့ (Customer အချက်အလက် အပြည့်အစုံနှင့် ကျသင့်ငွေအစုံပါဝင်သည်)
        deli_msg = (
            f"[Delivery ပို့ရန် Order အသစ်! #ID: {order_id}]\n\n"
            f"ဝယ်ယူသူ: {cust_name}\n"
            f"ဖုန်းနံပါတ်: {cust_phone}\n"
            f"လိပ်စာ: {cust_address}\n"
            f"မှတ်ချက်: {cust_remark or 'မရှိပါ'}\n\n"
            f"ဆိုင်: {shop_name}\n"
            f"မီနူး: {combined_menu_names}\n"
            f"ကောက်ခံရန်ငွေ: {float(total_price or 0):,.0f} ကျပ်"
        )
        send_telegram_notification(DELIVERY_CHAT_ID, deli_msg)

        return {
            "success": True, 
            "message": "Order created successfully", 
            "order_id": order_id, 
            "data": response.data
        }
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