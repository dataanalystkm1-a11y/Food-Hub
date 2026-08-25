from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Any
from database import supabase

router = APIRouter(prefix="/orders", tags=["Orders"])

class OrderStatusUpdate(BaseModel):
    order_status: str

class BatchOrderRequest(BaseModel):
    order_ids: List[int]

@router.get("")
def get_all_orders():
    try:
        response = supabase.table("orders").select("*, order_items(*, menu(*)), deli(*)").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch")
async def get_batch_orders(request: Request):
    try:
        body = await request.json()
        order_ids = body.get("order_ids", [])
        
        if not order_ids:
            return []
            
        response = supabase.table("orders").select("*").in_("order_id", order_ids).execute()
        return response.data
    except Exception as e:
        print(f"Batch Orders Error: {str(e)}")
        return []

@router.post("")
async def create_order(request: Request):
    try:
        body = await request.json()
        print("Received Frontend Data:", body)

        items = body.get("items", [])
        menu_names_list = []
        for item in items:
            m_name = item.get("menu_name") or item.get("name") or item.get("title")
            if m_name:
                menu_names_list.append(str(m_name))
        
        combined_menu_names = ", ".join(menu_names_list) if menu_names_list else body.get("menu_name")

        # deli_id ကို frontend က ပို့လာသည်များကို ဖမ်းယူခြင်း
        deli_id = body.get("deli_id") or body.get("deli")

        order_payload = {
            "customer_name": body.get("customer_name") or body.get("name"),
            "customer_phone": body.get("phone") or body.get("customer_phone"),
            "customer_address": body.get("address") or body.get("customer_address"),
            "total_amount": body.get("total_price") or body.get("total_amount"),
            "shop_name": body.get("shop_name"),
            "deli_name": body.get("deli_name"),
            "deli_id": deli_id,  # deli_id ထည့်သွင်းပေးခြင်း
            "menu_name": combined_menu_names,
            "order_status": "Pending"
        }

        response = supabase.table("orders").insert(order_payload).execute()
        
        created_order = response.data[0] if response.data else {}
        if created_order and "order_id" in created_order and items:
            order_id = created_order["order_id"]
            for item in items:
                menu_id = item.get("menu_id") or item.get("id")
                if not menu_id:
                    continue

                item_payload = {
                    "order_id": order_id,
                    "menu_id": menu_id,
                    "quantity": item.get("quantity", 1),
                    "price": item.get("price", 0)
                }
                try:
                    supabase.table("order_items").insert(item_payload).execute()
                except Exception as sub_err:
                    print(f"Order Item Insert Error: {sub_err}")

        # Frontend က order_id ကို လွယ်ကူစွာ ဖမ်းနိုင်ရန် order_id ထည့်ပေးလိုက်ပါပြီ
        return {
            "success": True, 
            "message": "Order created successfully", 
            "order_id": created_order.get("order_id"), 
            "data": response.data
        }
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