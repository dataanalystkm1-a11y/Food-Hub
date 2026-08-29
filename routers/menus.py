from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/shop-portal", tags=["Menus"])

class MenuCreate(BaseModel):
    shop_id: int
    menu_name: str
    price: float
    image_url: Optional[str] = None
    status: Optional[str] = "Active"

class MenuUpdate(BaseModel):
    price: float
    status: Optional[str] = "Active"

# --- ၁။ ဆိုင်ရှင် Dashboard အတွက် (Active ရော Inactive ရော မီနူးအားလုံး ဆွဲထုတ်ရန်) ---
@router.get("/menu/{shop_id}")
def get_shop_menus(shop_id: int):
    try:
        response = supabase.table("menu").select("*").eq("shop_id", shop_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ၂။ မီနူးအသစ် ထည့်ရန် ---
@router.post("/menu")
def create_menu(menu: MenuCreate):
    try:
        menu_data = menu.model_dump()
        menu_data["price"] = int(menu_data["price"])
        
        response = supabase.table("menu").insert(menu_data).execute()
        return {"success": True, "message": "Menu added successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ၃။ မီနူးအချက်အလက် / ဈေးနှုန်း / Status ပြင်ဆင်ရန် ---
@router.put("/menu/{menu_id}")
def update_menu(menu_id: int, menu_update: MenuUpdate):
    try:
        clean_price = int(menu_update.price)
        
        response = (
            supabase.table("menu")
            .update({"price": clean_price, "status": menu_update.status})
            .eq("menu_id", menu_id)
            .execute()
        )
        
        return {
            "success": True, 
            "message": "Menu updated successfully", 
            "data": response.data if hasattr(response, "data") else []
        }
    except Exception as e:
        print(f"Update Menu Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ၄။ မီနူးဖျက်ရန် ---
@router.delete("/menu/{menu_id}")
def delete_menu(menu_id: int):
    try:
        supabase.table("menu").delete().eq("menu_id", menu_id).execute()
        return {"success": True, "message": "Menu deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ၅။ ဝယ်သူသုံး App အတွက် (Active ဖြစ်နေသော မီနူးများကိုသာ ဆွဲထုတ်ရန်) ---
@router.get("/menus")
def get_all_menus():
    try:
        response = supabase.table("menu").select("*").eq("status", "Active").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))