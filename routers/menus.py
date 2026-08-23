from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(tags=["Menus"])

class MenuCreate(BaseModel):
    shop_id: int
    name: str
    price: float
    image_url: Optional[str] = None

class MenuUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None

@router.get("/menus")
def get_menus():
    try:
        response = supabase.table("menu").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/menus")
def create_menu(menu: MenuCreate):
    try:
        response = supabase.table("menu").insert(menu.dict()).execute()
        return {"message": "Menu added successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/menus/{menu_id}")
def update_menu(menu_id: int, menu_update: MenuUpdate):
    try:
        update_data = {k: v for k, v in menu_update.dict().items() if v is not None}
        response = supabase.table("menu").update(update_data).eq("menu_id", menu_id).execute()
        return {"message": "Menu updated successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/menus/{menu_id}")
def delete_menu(menu_id: int):
    try:
        supabase.table("menu").delete().eq("menu_id", menu_id).execute()
        return {"message": "Menu deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))