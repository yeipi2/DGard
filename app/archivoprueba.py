import serial
import time
import datetime
import re
import psycopg2
from psycopg2 import Error
import threading
import logging

# Logger configurado con microsegundos
class MicrosecondFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        dt = datetime.datetime.fromtimestamp(record.created)
        return dt.strftime('%Y-%m-%d %H:%M:%S.%f')

handler = logging.StreamHandler()
handler.setFormatter(MicrosecondFormatter('[%(asctime)s] %(message)s'))
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(handler)

# Configuración de la base de datos
DB_CONFIG = {
    'dbname': 'DGard',
    'user': 'postgres',
    'password': '',
    'host': 'localhost',
}

# Configuración de dispositivos
ESP32_CONFIG = [
    {
        'name': 'ESP32-PIR',
        'port': 'COM7',
        'baud': 9600,
        'camera_id': 7,
        'camera_ip': 'http://192.168.137.196/stream',
        'tipo': 'completo',  # Maneja inicio y fin
        'pat_inicio': r"Movimiento detectado",
        'pat_fin': r"Movimiento finalizado\. Duración: (\d+) segundos",
        'descripcion': 'Movimiento detectado en la entrada'
    },
    {
        'name': 'ESP32-CAM',
        'port': 'COM8',
        'baud': 115200,
        'camera_id': 8,
        'camera_ip': 'http://192.168.137.197/stream',
        'tipo': 'simple',  # Solo registra evento simple
        'pat_simple': r"¡MOVIMIENTO CONFIRMADO!",
        'descripcion': 'Movimiento detectado en el estacionamiento'
    }
]

# Conexión a la base de datos
def connect_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        logger.info("Conectado a la base de datos")
        return conn
    except Error as e:
        logger.error(f"Error conectando a la base de datos: {e}")
        return None

# Registrar evento movimiento
def record_motion_event(conn, cam_id, cam_ip, descripcion):
    cur = conn.cursor()
    fecha = datetime.date.today()
    hora = datetime.datetime.now().time()
    cur.execute(
        "INSERT INTO eventos_movimiento (id_camara, fecha_evento, hora_evento, descripcion, ip_sensor)"
        " VALUES (%s, %s, %s, %s, %s) RETURNING id_evento",
        (cam_id, fecha, hora, descripcion, cam_ip)
    )
    event_id = cur.fetchone()[0]
    conn.commit()
    logger.info(f"Evento registrado ID {event_id}")
    return event_id

# Actualizar conteo diario
def update_event_count(conn, cam_id):
    cur = conn.cursor()
    today = datetime.date.today()
    cur.execute(
        "SELECT id_conteo, cantidad_movimientos FROM conteo_movimientos"
        " WHERE id_camara=%s AND fecha=%s",
        (cam_id, today)
    )
    row = cur.fetchone()
    if row:
        idc, cnt = row
        cur.execute(
            "UPDATE conteo_movimientos SET cantidad_movimientos=%s WHERE id_conteo=%s",
            (cnt+1, idc)
        )
    else:
        cur.execute(
            "INSERT INTO conteo_movimientos (id_camara, fecha, cantidad_movimientos)"
            " VALUES (%s,%s,%s)",
            (cam_id, today, 1)
        )
    conn.commit()
    logger.info("Conteo diario actualizado")

# Registrar duración
def record_motion_duration(conn, event_id, duration):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO duracion_movimiento (id_evento, duracion_segundos) VALUES (%s,%s)",
        (event_id, duration)
    )
    conn.commit()
    logger.info(f"Duración registrada: {duration}s para evento {event_id}")

# Monitor de puerto serie
def monitor_serial(cfg, conn):
    ser = None
    while True:
        try:
            if ser is None or not ser.is_open:
                ser = serial.Serial(cfg['port'], cfg['baud'], timeout=1)
                logger.info(f"Conectado a {cfg['name']} en {cfg['port']}")
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue

            if cfg['tipo'] == 'completo':
                # Dispositivo que maneja inicio y fin
                if re.search(cfg['pat_inicio'], line):
                    logger.info(f"{cfg['name']}: Inicio detectado")
                    eid = record_motion_event(conn, cfg['camera_id'], cfg['camera_ip'], cfg['descripcion'])
                    update_event_count(conn, cfg['camera_id'])
                    cfg['ultimo_evento'] = eid
                m = re.search(cfg['pat_fin'], line)
                if m and 'ultimo_evento' in cfg:
                    dur = int(m.group(1))
                    logger.info(f"{cfg['name']}: Fin detectado, duración={dur}s")
                    record_motion_duration(conn, cfg['ultimo_evento'], dur)
                    del cfg['ultimo_evento']

            elif cfg['tipo'] == 'simple':
                # Dispositivo que solo registra el evento simple
                if re.search(cfg['pat_simple'], line, re.IGNORECASE):
                    logger.info(f"{cfg['name']}: Movimiento detectado (simple)")
                    record_motion_event(conn, cfg['camera_id'], cfg['camera_ip'], cfg['descripcion'])
                    update_event_count(conn, cfg['camera_id'])

        except Exception as e:
            logger.error(f"Error en {cfg['name']}: {e}")
            if ser and ser.is_open:
                ser.close()
            time.sleep(2)

# Main
def main():
    conn = connect_db()
    if not conn:
        return

    # Crear tablas si no existen
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS conteo_movimientos (
      id_conteo SERIAL PRIMARY KEY,
      id_camara INTEGER REFERENCES camaras(id_camara) ON DELETE SET NULL,
      fecha DATE NOT NULL,
      cantidad_movimientos INTEGER DEFAULT 0,
      hora_pico TIME
    );
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS duracion_movimiento (
      id_duracion SERIAL PRIMARY KEY,
      id_evento INTEGER REFERENCES eventos_movimiento(id_evento) ON DELETE CASCADE,
      duracion_segundos INTEGER NOT NULL
    );
    """)
    conn.commit()

    threads = []
    for cfg in ESP32_CONFIG:
        t = threading.Thread(target=monitor_serial, args=(cfg, conn), daemon=True)
        threads.append(t)
        t.start()
        logger.info(f"Hilo iniciado para {cfg['name']}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Terminando...")
        conn.close()

if __name__ == '__main__':
    main()
