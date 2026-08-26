from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/shop-portal", tags=["Shop Portal"])

class OrderStatusUpdate(BaseModel):
    order_status: str  # Accepted, Preparing, Delivering, Completed, Cancelled

class MenuCreate(BaseModel):
    shop_id: int
    menu_name: str
    price: float
    description: Optional[str] = ""

class MenuUpdate(BaseModel):
    menu_name: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None

# --- 1. Order Status ကို ပြောင်းလဲခြင်း (Confirm လုပ်ခြင်း) ---
@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: int, payload: OrderStatusUpdate):
    try:
        response = supabase.table("orders").update({"order_status": payload.order_status}).eq("order_id", order_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"success": True, "message": f"Order status updated to {payload.order_status}", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. ဆိုင်အတွက် မီနူးအသစ် ထပ်ထည့်ခြင်း ---
@router.post("/menu")
async def add_menu_item(payload: MenuCreate):
    try:
        menu_payload = {
            "shop_id": payload.shop_id,
            "menu_name": payload.menu_name,
            "price": payload.price,
            "description": payload.description
        }
        response = supabase.table("menu").insert(menu_payload).execute()
        return {"success": True, "message": "Menu added successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. မီနူးဈေးနှုန်း သို့မဟုတ် အချက်အလက် ပြင်ဆင်ခြင်း ---
@router.put("/menu/{menu_id}")
async def update_menu_item(menu_id: int, payload: MenuUpdate):
    try:
        update_data = {}
        if payload.menu_name is not None:
            update_data["menu_name"] = payload.menu_name
        if payload.price is not None:
            update_data["price"] = payload.price
        if payload.description is not None:
            update_data["description"] = payload.description

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        response = supabase.table("menu").update(update_data).eq("menu_id", menu_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Menu item not found")
        return {"success": True, "message": "Menu updated successfully", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 4. ဆိုင်တစ်ဆိုင်ချင်းစီ၏ မီနူးစာရင်းများကို ကြည့်ရှုရန် ---
@router.get("/menu/{shop_id}")
async def get_shop_menus(shop_id: int):
    try:
        response = supabase.table("menu").select("*").eq("shop_id", shop_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 5. ဆိုင်အချက်အလက် (ဆိုင်နာမည်) ကို ဆွဲထုတ်ရန် ---
@router.get("/info/{shop_id}")
async def get_shop_info(shop_id: int):
    try:
        response = supabase.table("shops").select("*").eq("shop_id", shop_id).execute()
        if response.data:
            return {"success": True, "data": {"shop_name": response.data[0].get("shop_name", "Shop")}}
        return {"success": False, "message": "Shop not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 6. ဆိုင်အတွက် ဝင်လာသော အော်ဒာများကို ဆွဲထုတ်ရန် ---
@router.get("/orders/{shop_id}")
async def get_shop_orders(shop_id: int):
    try:
        response = supabase.table("orders").select("*").eq("shop_id", shop_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))