from fastapi import APIRouter, HTTPException
from database import supabase

router = APIRouter(tags=["Shops"])

@router.get("/shops")
def get_shops():
    try:
        response = supabase.table("shops").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))