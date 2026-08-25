from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/orders", tags=["Orders"])

class OrderStatusUpdate(BaseModel):
    order_status: str

@router.get("")
def get_all_orders():
    try:
        response = supabase.table("orders").select("*, order_items(*, menu(*)), deli(*)").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_order(request: Request):
    try:
        body = await request.json()
        print("Received Frontend Data:", body)

        # Frontend က ပို့လိုက်တဲ့ အချက်အလက်များကို Supabase Table structure နဲ့ အံဝင်ခွင်ကျ ဖြစ်စေခြင်း
        order_payload = {
            "customer_name": body.get("customer_name"),
            "customer_phone": body.get("phone") or body.get("customer_phone"),
            "customer_address": body.get("address") or body.get("customer_address"),
            "total_amount": body.get("total_price") or body.get("total_amount"),
            "shop_name": body.get("shop_name"),      # ဆိုင်နာမည်
            "deli_name": body.get("deli_name"),      # Deli နာမည်
            "menu_name": body.get("menu_name"),      # 👈 မီနူးနာမည် အသစ်ထည့်သွင်းခြင်း
            "order_status": "Pending"                # ပုံမှန်အစအနေနဲ့ Pending ထားမယ်
        }

        response = supabase.table("orders").insert(order_payload).execute()
        return {"success": True, "message": "Order created successfully", "data": response.data}
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