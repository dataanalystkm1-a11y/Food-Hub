from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from supabase import create_client, Client

app = FastAPI(title="WATI Food Hub API")

# CORS Middleware (frontend ကနေ လှမ်းခေါ်လို့ရအောင်)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Connection
SUPABASE_URL = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "YOUR_SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Pydantic Models
class OrderItem(BaseModel):
    menu_id: int
    quantity: int
    price_at_order: float

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_address: str
    total_amount: float
    deli_id: int
    order_status: Optional[str] = "Pending"
    items: List[OrderItem]

class OrderBatchRequest(BaseModel):
    order_ids: List[int]

# 1. Get Shops
@app.get("/shops")
def get_shops():
    try:
        response = supabase.table("shops").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. Get Menus
@app.get("/menus")
def get_menus():
    try:
        response = supabase.table("menu").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Get Delis (Delivery စာရင်းများအတွက်)
@app.get("/deli")
def get_delis():
    try:
        response = supabase.table("deli").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Create Order
@app.post("/orders")
def create_order(order: OrderCreate):
    try:
        # Orders table ထဲသို့ ဦးစွာထည့်မည်
        order_data = {
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "customer_address": order.customer_address,
            "total_amount": order.total_amount,
            "deli_id": order.deli_id,
            "order_status": order.order_status
        }
        order_res = supabase.table("orders").insert(order_data).execute()
        
        if not order_res or not order_res.data:
            raise HTTPException(status_code=400, detail="Order တင်၍ မရပါ")
        
        new_order_id = order_res.data[0]["order_id"]

        # Order Items များကို order_items table ထဲသို့ ထည့်မည်
        items_data = []
        for item in order.items:
            items_data.append({
                "order_id": new_order_id,
                "menu_id": item.menu_id,
                "quantity": item.quantity,
                "price_at_order": item.price_at_order
            })
        
        supabase.table("order_items").insert(items_data).execute()

        return {"message": "Order successfully created", "order_id": new_order_id}
    except Exception as e:
        print("ORDER ERROR DETAIL:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

# 5. Get Orders by Batch (Local History အတွက်)
@app.post("/orders/batch")
def get_orders_batch(req: OrderBatchRequest):
    try:
        if not req.order_ids:
            return []
        response = supabase.table("orders").select("*").in_("order_id", req.order_ids).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))