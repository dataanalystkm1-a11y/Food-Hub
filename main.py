from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from routers import orders, menus

app = FastAPI(title="WATI Food Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers များကို ချိတ်ဆက်ခြင်း
app.include_router(orders.router)
app.include_router(menus.router)

# Shops API Endpoint
@app.get("/shops")
def get_shops():
    try:
        response = supabase.table("shops").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Deli API Endpoint
@app.get("/deli")
def get_deli():
    try:
        response = supabase.table("deli").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"message": "WATI Food Hub API is running smoothly!"}