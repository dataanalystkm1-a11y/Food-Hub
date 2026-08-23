from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

@app.get("/")
def root():
    return {"message": "WATI Food Hub API is running smoothly!"}