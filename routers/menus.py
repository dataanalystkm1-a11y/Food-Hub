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

class MenuUpdate(BaseModel):
    price: float

@router.get("/menu/{shop_id}")
def get_shop_menus(shop_id: int):
    try:
        response = supabase.table("menu").select("*").eq("shop_id", shop_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/menu")
def create_menu(menu: MenuCreate):
    try:
        # price ကို int သို့ ပြောင်းလဲပေးခြင်း
        menu_data = menu.model_dump()
        menu_data["price"] = int(menu_data["price"])
        
        response = supabase.table("menu").insert(menu_data).execute()
        return {"success": True, "message": "Menu added successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/menu/{menu_id}")
def update_menu(menu_id: int, menu_update: MenuUpdate):
    try:
        # ဒဿမကိန်း မပါစေရန် int သို့ တိကျစွာ ပြောင်းပေးပါ (Database က bigint ဖြစ်သောကြောင့်ပါ)
        clean_price = int(menu_update.price)
        
        response = (
            supabase.table("menu")
            .update({"price": clean_price})
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

@router.delete("/menu/{menu_id}")
def delete_menu(menu_id: int):
    try:
        supabase.table("menu").delete().eq("menu_id", menu_id).execute()
        return {"success": True, "message": "Menu deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # မီနူးအားလုံးကို ဆွဲထုတ်ရန် (Home page အတွက်)
@router.get("/menus")
def get_all_menus():
    try:
        response = supabase.table("menu").select("*").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))