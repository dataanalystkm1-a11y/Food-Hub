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

@router.get("/menu/{shop_id}")
def get_shop_menus(shop_id: int):
    try:
        response = supabase.table("menu").select("*").eq("shop_id", shop_id).eq("status", "Active").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/menu")
def create_menu(menu: MenuCreate):
    try:
        menu_data = menu.model_dump()
        menu_data["price"] = int(menu_data["price"])
        
        response = supabase.table("menu").insert(menu_data).execute()
        return {"success": True, "message": "Menu added successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@router.delete("/menu/{menu_id}")
def delete_menu(menu_id: int):
    try:
        supabase.table("menu").delete().eq("menu_id", menu_id).execute()
        return {"success": True, "message": "Menu deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/menus")
def get_all_menus():
    try:
        response = supabase.table("menu").select("*").eq("status", "Active").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))