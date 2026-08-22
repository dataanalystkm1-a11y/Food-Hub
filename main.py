import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
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

# app.js က ပို့မည့် Order Item ပုံစံ
class OrderItem(BaseModel):
    menu_id: int
    quantity: int
    price_at_order: int

# app.js က ပို့မည့် Main Order Payload ပုံစံ
class Order(BaseModel):
    customer_name: str
    customer_phone: str
    customer_address: str
    total_amount: int
    deli_id: int
    order_status: Optional[str] = "Pending"
    items: List[OrderItem]

class BatchOrders(BaseModel):
    order_ids: List[int]

@app.get("/")
def read_root():
    return {"message": "Nway's Order App is running successfully!"}

@app.get("/shops")
def get_shops():
    response = supabase.table("shops").select("*").execute()
    return response.data

@app.get("/menus")
def get_menus():
    response = supabase.table("menu").select("*").execute()
    return response.data

@app.get("/deli")
def get_deli():
    try:
        response = supabase.table("deli").select("*").execute()
        return response.data
    except Exception as e:
        print("Error fetching deli:", str(e))
        return {"error": str(e)}

@app.post("/orders")
def create_order(order: Order):
    try:
        # 1. Orders table ထဲသို့ ဦးစွာ သိမ်းမည် (Supabase table ဖွဲ့စည်းပုံပေါ်မူတည်၍ column များကို ထည့်ပါ)
        order_data = {
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "customer_address": order.customer_address,
            "total_amount": order.total_amount,
            "deli_id": order.deli_id,
            "order_status": order.order_status
        }
        
        response = supabase.table("orders").insert(order_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to insert order")
            
        created_order = response.data[0]
        new_order_id = created_order.get("order_id") or created_order.get("id")

        return {"message": "Order placed successfully!", "order_id": new_order_id}
    except Exception as e:
        print("Error creating order:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

# app.js က ခေါ်ဆိုနေသော Order History Batch Endpoint
@app.post("/orders/batch")
def get_batch_orders(payload: BatchOrders):
    try:
        if not payload.order_ids:
            return []
        
        response = supabase.table("orders").select("*").in_("order_id", payload.order_ids).execute()
        return response.data
    except Exception as e:
        print("Error fetching batch orders:", str(e))
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)