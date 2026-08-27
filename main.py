import os
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
from database import supabase

# Router များကို တိကျမှန်ကန်စွာ ခေါ်ယူခြင်း
from routers import orders, menus, shops_portal

app = FastAPI(title="WATI Food Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Telegram Bot Configuration ---
TELEGRAM_BOT_TOKEN = "8453664740:AAGiLC4MPpz7Ce_B2-UuZWHyK2TKA35Mj0Q"
ADMIN_CHAT_ID = "5921089974"
DELIVERY_CHAT_ID = "7295294892"

def send_telegram_notification(chat_id: str, message: str):
    if not TELEGRAM_BOT_TOKEN or chat_id == "YOUR_CHAT_ID":
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

# Routers များကို အက်ပလီကေးရှင်းသို့ ချိတ်ဆက်ခြင်း
app.include_router(orders.router)
app.include_router(menus.router)
app.include_router(shops_portal.router)

# --- Home Page အတွက် မီနူးအားလုံး ဆွဲထုတ်ရန် Endpoint ---
@app.get("/menus")
def get_all_menus():
    try:
        response = supabase.table("menu").select("*").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Telegram Webhook (ဆိုင်ရှင်က Confirm ခလုတ်နှိပ်သည့်အခါ လုပ်ဆောင်ရန်) ---
@app.post("/telegram-webhook")
async def telegram_webhook(req: Request):
    try:
        data = await req.json()
        print("Received Telegram Webhook Data:", data)
        
        if "callback_query" in data:
            callback = data["callback_query"]
            callback_data = callback["data"]  # ဥပမာ - "confirm_55"
            chat_id = callback["message"]["chat"]["id"]
            message_id = callback["message"]["message_id"]
            callback_query_id = callback["id"]
            
            # ၁။ Telegram ခလုတ် Loading အရောင်ပြေးနေတာ ပျောက်သွားအောင် ချက်ချင်း အကြောင်းပြန်ရန်
            answer_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery"
            requests.post(answer_url, json={
                "callback_query_id": callback_query_id,
                "text": "အော်ဒာ အတည်ပြုပြီးပါပြီ ✅"
            })
            
            if "_" in callback_data:
                action, order_id_str = callback_data.split("_", 1)
                try:
                    order_id = int(order_id_str)
                except ValueError:
                    order_id = order_id_str

                if action == "confirm":
                    new_status = "Accepted"
                    
                    # ၂။ Supabase Database ထဲတွင် Order Status ကို Accepted သို့ ပြောင်းရန်
                    res = supabase.table("orders").update({"order_status": new_status}).eq("order_id", order_id).execute()
                    print("Supabase Update Result:", res)
                    
                    # ၃။ မူလ Telegram မက်ဆေ့ချ်ကို အတည်ပြုပြီးကြောင်း ပြောင်းလဲ၍ ခလုတ်ကို ဖယ်ရှားရန်
                    edit_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText"
                    original_text = callback["message"].get("text", "")
                    
                    requests.post(edit_url, json={
                        "chat_id": chat_id,
                        "message_id": message_id,
                        "text": original_text + f"\n\n*Status: Order အတည်ပြုပြီးပါပြီ ✅*",
                        "parse_mode": "Markdown",
                        "reply_markup": {"inline_keyboard": []}  # နှိပ်ပြီးသား ခလုတ်ကို ဖြုတ်ပစ်ရန်
                    })
        
        return {"ok": True}
    except Exception as e:
        print(f"Webhook Error: {e}")
        return {"ok": False, "error": str(e)}

# --- Shop Dashboard UI ကို Render လုပ်ရန် ---
@app.get("/shop-dashboard", response_class=HTMLResponse)
async def shop_dashboard():
    file_path = "templates/shop_dashboard.html"
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Dashboard template not found</h1>"

# Shops API Endpoint
@app.get("/shops")
def get_shops():
    try:
        response = supabase.table("shops").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Deli API Endpoint
@app.get("/deli")
def get_deli():
    try:
        response = supabase.table("deli").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"message": "WATI Food Hub API is running smoothly!"}