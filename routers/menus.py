from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/shop-portal", tags=["Menus"])

class MenuCreate(BaseModel):
    shop_id: int
    menu_name: str  # <--- name မှ a menu_name သို့ ပြင်ရန်
    price: float
    image_url: Optional[str] = None

class MenuUpdate(BaseModel):
    menu_name: Optional[str] = None  # <--- name မှ a menu_name သို့ ပြင်ရန်
    price: Optional[float] = None
    image_url: Optional[str] = None

@router.get("/menu/{shop_id}")
def get_shop_menus(shop_id: int):
    try:
        # Database ထဲမှ menu table ကို shop_id ဖြင့် ဆွဲထုတ်ရန်
        response = supabase.table("menu").select("*").eq("shop_id", shop_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/menu")
def create_menu(menu: MenuCreate):
    try:
        response = supabase.table("menu").insert(menu.dict()).execute()
        return {"success": True, "message": "Menu added successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/menu/{menu_id}")
def update_menu(menu_id: int, menu_update: MenuUpdate):
    try:
        update_data = {k: v for k, v in menu_update.dict().items() if v is not None}
        response = supabase.table("menu").update(update_data).eq("menu_id", menu_id).execute()
        return {"success": True, "message": "Menu updated successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/menu/{menu_id}")
def delete_menu(menu_id: int):
    try:
        supabase.table("menu").delete().eq("menu_id", menu_id).execute()
        return {"success": True, "message": "Menu deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))