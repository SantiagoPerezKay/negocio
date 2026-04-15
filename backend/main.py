from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routers import ventas, caja, stock, clientes, proveedores, estadisticas

app = FastAPI(
    title="Sistema Fotocopiadora/Kiosco",
    description="Backend para gestión de caja, stock, clientes y proveedores",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ventas.router)
app.include_router(caja.router)
app.include_router(stock.router)
app.include_router(clientes.router)
app.include_router(proveedores.router)
app.include_router(estadisticas.router)


@app.on_event("startup")
async def startup():
    await create_tables()


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "negocio-backend"}
