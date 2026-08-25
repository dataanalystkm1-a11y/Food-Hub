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

        # Frontend က ပို့လာတဲ့ items တွေထဲက မီနူးနာမည်တွေကို စုစည်းခြင်း (သို့မဟုတ် body ထဲက menu_name ကိုယူခြင်း)
        items = body.get("items", [])
        menu_names_list = []
        for item in items:
            # item ထဲမှာ menu_name ပါပြီးသားလား သို့မဟုတ် name လား စစ်ဆေးခြင်း
            m_name = item.get("menu_name") or item.get("name") or item.get("title")
            if m_name:
                menu_names_list.append(str(m_name))
        
        # မီနူးနာမည်များကို Comma ခြားစာသားအဖြစ် ပြောင်းလဲခြင်း (သို့မဟုတ် body ထဲကလာတာကို သုံးခြင်း)
        combined_menu_names = ", ".join(menu_names_list) if menu_names_list else body.get("menu_name")

        # Supabase Table structure နဲ့ အံဝင်ခွင်ကျ ဖြစ်စေရန် data payload တည်ဆောက်ခြင်း
        order_payload = {
            "customer_name": body.get("customer_name") or body.get("name"),
            "customer_phone": body.get("phone") or body.get("customer_phone"),
            "customer_address": body.get("address") or body.get("customer_address"),
            "total_amount": body.get("total_price") or body.get("total_amount"),
            "shop_name": body.get("shop_name"),       # ဆိုင်နာမည်
            "deli_name": body.get("deli_name"),       # Deli နာမည်
            "menu_name": combined_menu_names,         # မီနူးနာမည်များ
            "order_status": "Pending"                 # ပုံမှန်အစအနေနဲ့ Pending ထားမည်
        }

        response = supabase.table("orders").insert(order_payload).execute()
        
        # အကယ်၍ order_items table ကိုပါ ထည့်သုံးချင်လျှင် ဤနေရာတွင် ဆက်လက် လုပ်ဆောင်နိုင်ပါသည်
        created_order = response.data[0] if response.data else None
        if created_order and "order_id" in created_order and items:
            order_id = created_order["order_id"]
            for item in items:
                item_payload = {
                    "order_id": order_id,
                    "menu_id": item.get("menu_id") or item.get("id"),
                    "quantity": item.get("quantity", 1),
                    "price": item.get("price", 0)
                }
                try:
                    supabase.table("order_items").insert(item_payload).execute()
                except Exception as sub_err:
                    print(f"Order Item Insert Error: {sub_err}")

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