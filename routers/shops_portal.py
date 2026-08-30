from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from database import supabase
import time
import os

router = APIRouter(prefix="/shop-portal", tags=["Shop Portal"])

class OrderStatusUpdate(BaseModel):
    order_status: str  # Accepted, Preparing, Delivering, Completed, Cancelled

class MenuCreate(BaseModel):
    shop_id: int
    menu_name: str
    price: float
    description: Optional[str] = ""
    status: Optional[str] = "Active"

class MenuUpdate(BaseModel):
    menu_name: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    status: Optional[str] = None

class MenuStatusUpdate(BaseModel):
    status: str  # Active သို့မဟုတ် Inactive

# --- Menu Option များအတွက် Model နှင့် Endpoints အသစ်များ ---
class MenuOptionCreate(BaseModel):
    menu_id: int
    group_name: str
    choice_name: str
    additional_price: Optional[float] = 0

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
            "description": payload.description,
            "status": payload.status
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
        if payload.status is not None:
            update_data["status"] = payload.status

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        response = supabase.table("menu").update(update_data).eq("menu_id", menu_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Menu item not found")
        return {"success": True, "message": "Menu updated successfully", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3.1 မီနူး Status (Active / Inactive) သီးသန့်ပြောင်းလဲခြင်း ---
@router.put("/menu/status/{menu_id}")
async def update_menu_status(menu_id: int, payload: MenuStatusUpdate):
    try:
        response = supabase.table("menu").update({"status": payload.status}).eq("menu_id", menu_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Menu item not found")
        return {"success": True, "message": f"Menu status updated to {payload.status}", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 4. ဆိုင်တစ်ဆိုင်ချင်းစီ၏ မီနူးစာရင်းအားလုံးကို (Active နှင့် Inactive ပါ အကုန်) ဆိုင်ရှင် Dashboard အတွက် ကြည့်ရှုရန် ---
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

# --- 6. ဆိုင်အတွက် ဝင်လာသော အော်ဒာများကို shop_id ဖြင့် တိုက်ရိုက်ဆွဲထုတ်ရန် ---
@router.get("/orders/{shop_id}")
async def get_shop_orders(shop_id: int):
    try:
        response = supabase.table("orders").select("*").eq("shop_id", shop_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 7. ဆိုင်ရှင်များ ဖုန်း/ကွန်ပျူတာမှ ပုံတင်ရန် Endpoint ---
@router.post("/upload-image")
async def upload_shop_image(file: UploadFile = File(...), shop_id: int = Form(...)):
    try:
        contents = await file.read()
        file_extension = file.filename.split(".")[-1]
        
        file_name = f"shop_{shop_id}_{int(time.time())}.{file_extension}"
        file_path = f"Mei Mei Shop/{file_name}"
        
        response = supabase.storage.from_("menu-images").upload(
            path=file_path,
            file=contents,
            file_options={"content-type": file.content_type}
        )
        
        return {
            "success": True, 
            "message": "Image uploaded successfully", 
            "image_path": file_path
        }
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 8. ဝယ်သူသုံး App အတွက် Active ဖြစ်နေသော မီနူးများကိုသာ ဆွဲထုတ်ရန် ---
@router.get("/menus")
async def get_all_active_menus():
    try:
        response = supabase.table("menu").select("*").eq("status", "Active").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 9. မီနူး Option များ ထည့်သွင်းခြင်းနှင့် ဆွဲထုတ်ခြင်း API များ ---
@router.post("/menu-options")
async def add_menu_option(option: MenuOptionCreate):
    try:
        response = supabase.table("menu_options").insert({
            "menu_id": option.menu_id,
            "group_name": option.group_name,
            "choice_name": option.choice_name,
            "additional_price": option.additional_price
        }).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/menu-options/{menu_id}")
async def get_menu_options(menu_id: int):
    try:
        response = supabase.table("menu_options").select("*").eq("menu_id", menu_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/menu-options/{option_id}")
async def delete_menu_option(option_id: int):
    try:
        supabase.table("menu_options").delete().eq("option_id", option_id).execute()
        return {"success": True, "message": "Menu option deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))