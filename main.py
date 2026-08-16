import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

SUPABASE_URL = "https://xdxyjcuqtajwdiunmahy.supabase.co"
SUPABASE_KEY = "sb_publishable_fQhBAJ_5C9dm1cJEYAwSwg_IY2tU1Rm"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Order(BaseModel):
    shop_id: int
    shop_name: str
    customer_name: str
    phone: str
    address: str
    menu_id: int
    menu_name: str
    total_price: int
    deli_id: int

@app.get("/")
def read_root():
    return {"message": "Nway's Order App is running successfully!"}

@app.get("/shops")
def get_shops():
    response = supabase.table("shops").select("*").execute()
    return response.data

@app.get("/menus")
def get_menus():
    # Supabase table name 'menu' ကို မှန်ကန်စွာ ချိတ်ဆက်ပေးထားပါသည်
    response = supabase.table("menu").select("*").execute()
    return response.data

@app.get("/delis")
def get_delis():
    response = supabase.table("delis").select("*").execute()
    return response.data

@app.post("/orders")
def create_order(order: Order):
    data = {
        "shop_id": order.shop_id,
        "shop_name": order.shop_name,
        "customer_name": order.customer_name,
        "phone": order.phone,
        "address": order.address,
        "menu_id": order.menu_id,
        "menu_name": order.menu_name,
        "total_price": order.total_price,
        "deli_id": order.deli_id
    }
    response = supabase.table("orders").insert(data).execute()
    return {"message": "Order placed successfully!", "data": response.data}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
