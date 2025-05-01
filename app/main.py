from fastapi import FastAPI, Request
from pydantic import BaseModel
import psycopg2
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Permitir CORS por si accedes desde otro host
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo para validar los datos entrantes
class EventoMovimiento(BaseModel):
    descripcion: str
    duracion: int
    ip_sensor: str

# Conexión a PostgreSQL
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="DGard",
        user="postgres",
        password=""
    )
    return conn

@app.post("/evento")
async def recibir_evento(req: Request):
    data = await req.json()
    ip_sensor = data.get("ip_sensor")
    duracion = data.get("duracion", 1)

    fecha = datetime.now().date()
    hora = datetime.now().time()

    conn = psycopg2.connect(
        host="localhost",
        database="DGard",
        user="postgres",
        password=""
    )
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO eventos_movimiento (ip_sensor, fecha_evento, hora_evento)
        VALUES (%s, %s, %s) RETURNING id_evento
    """, (ip_sensor, fecha, hora))
    id_evento = cur.fetchone()[0]
    cur.execute("""
        INSERT INTO duracion_movimiento (id_evento, duracion_segundos)
        VALUES (%s, %s)
    """, (id_evento, duracion))
    conn.commit()
    cur.close()
    conn.close()
    return {"mensaje": "Evento recibido"}