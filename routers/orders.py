from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import supabase  # database.py ထဲက supabase client ကို ယူသုံးမယ်

router = APIRouter(prefix="/orders", tags=["Orders"])

class OrderStatusUpdate(BaseModel):
    order_status: str

# Frontend က ပို့လိုက်မည့် Order ဒေတာပုံစံ (Schema)
class OrderCreate(BaseModel):
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    items: Optional[list] = None
    total_price: Optional[float] = None
    deli_service: Optional[str] = None
    payment_method: Optional[str] = None

@router.get("")
def get_all_orders():
    try:
        response = supabase.table("orders").select("*, order_items(*, menu(*)), deli(*)").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 👉 ဒီနေရာမှာ Order အသစ်တင်ရန် POST endpoint ကို ထပ်ထည့်ပေးလိုက်ပါတယ်
@router.post("")
def create_order(order: OrderCreate):
    try:
        # Supabase ရဲ့ orders table ထဲသို့ ဒေတာထည့်သွင်းခြင်း
        response = supabase.table("orders").insert(order.dict(exclude_unset=True)).execute()
        return {"success": True, "message": "Order created successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}/status")
def update_order_status(order_id: int, status_update: OrderStatusUpdate):
    try:
        response = supabase.table("orders").update({"order_status": status_update.order_status}).eq("order_id", order_id).execute()
        return {"message": "Order status updated successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))