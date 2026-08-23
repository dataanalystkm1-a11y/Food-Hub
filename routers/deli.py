from fastapi import APIRouter, HTTPException
from database import supabase

router = APIRouter(tags=["Deli"])

@router.get("/deli")
def get_deli():
    try:
        response = supabase.table("deli").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))