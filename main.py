import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from database import supabase
from routers import orders, menus

app = FastAPI(title="WATI Food Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Telegram Bot Configuration ---
TELEGRAM_BOT_TOKEN = "8453664740:AAGiLC4MPpz7Ce_B2-UuZWHyK2TKA35Mj0Q"  # နွေးရဲ့ Bot Token ထည့်ရန်
ADMIN_CHAT_ID = "7295294892"             # ဆိုင်ရှင် Chat ID ထည့်ရန်
DELIVERY_CHAT_ID = "5921089974"       # Deli Team Chat ID ထည့်ရန်

def send_telegram_notification(chat_id: str, message: str):
    if not TELEGRAM_BOT_TOKEN or chat_id == "YOUR_CHAT_ID":
        return  # Token မရှိသေးရင် Error မတက်အောင် ကျော်သွားမည်
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

# Routers များကို ချိတ်ဆက်ခြင်း
app.include_router(orders.router)
app.include_router(menus.router)

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