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

# Umbrales de duración para clasificación de eventos (en segundos)
DURACION_CORTA = 15  # Movimientos de menos de 10 segundos
DURACION_MEDIA = 30  # Movimientos entre 10 y 30 segundos
# Más de 30 segundos se considera duración larga

# Configuración de dispositivos
ESP32_CONFIG = [
    {
        'name': 'ESP32-PIR',
        'port': 'COM7',
        'baud': 9600,
        'camera_id': 9,
        'camera_ip': 'http://192.168.137.198/stream',
        'tipo': 'completo',  # Maneja inicio y fin
        'pat_inicio': r"Movimiento detectado - Inicio de evento",
        'pat_fin': r"Duración del movimiento \(s\): (\d+)",
        'ubicacion': 'entrada'
    },
    {
        'name': 'ESP32-CAM',
        'port': 'COM8',
        'baud': 115200,
        'camera_id': 8,
        'camera_ip': 'http://192.168.137.197/stream',
        'tipo': 'completo',  # Cambiado a completo para capturar duración
        'pat_inicio': r"Movimiento detectado - Inicio de evento",
        'pat_fin': r"Duración del movimiento \(s\): (\d+)",
        'ubicacion': 'estacionamiento'
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

# Determinar la descripción basada en la duración
def get_description_by_duration(ubicacion, duration):
    if duration < DURACION_CORTA:
        return f"Movimiento breve detectado en {ubicacion} ({duration}s)"
    elif duration < DURACION_MEDIA:
        return f"Movimiento moderado detectado en {ubicacion} ({duration}s)"
    else:
        return f"Movimiento prolongado detectado en {ubicacion} ({duration}s)"

# Registrar evento movimiento completo (incluyendo duración)
def record_complete_motion_event(conn, cam_id, cam_ip, descripcion, duration):
    try:
        cur = conn.cursor()
        fecha = datetime.date.today()
        hora = datetime.datetime.now().time()
        
        # Insertar en eventos_movimiento
        cur.execute(
            "INSERT INTO eventos_movimiento (id_camara, fecha_evento, hora_evento, descripcion, ip_sensor)"
            " VALUES (%s, %s, %s, %s, %s) RETURNING id_evento",
            (cam_id, fecha, hora, descripcion, cam_ip)
        )
        event_id = cur.fetchone()[0]
        
        # Insertar en duracion_movimiento
        cur.execute(
            "INSERT INTO duracion_movimiento (id_evento, duracion_segundos) VALUES (%s,%s)",
            (event_id, duration)
        )
        
        # Actualizar conteo_movimientos
        cur.execute(
            "SELECT id_conteo, cantidad_movimientos FROM conteo_movimientos"
            " WHERE id_camara=%s AND fecha=%s",
            (cam_id, fecha)
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
                (cam_id, fecha, 1)
            )
        
        conn.commit()
        logger.info(f"Evento completo registrado ID {event_id} con duración {duration}s")
        return event_id
    except Error as e:
        logger.error(f"Error al registrar evento completo: {e}")
        conn.rollback()
        return None

# Monitor de puerto serie
def monitor_serial(cfg, conn):
    ser = None
    pending_events = {}  # Almacena información temporal de eventos pendientes
    
    while True:
        try:
            if ser is None or not ser.is_open:
                ser = serial.Serial(cfg['port'], cfg['baud'], timeout=1)
                logger.info(f"Conectado a {cfg['name']} en {cfg['port']}")
                
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue
                
            logger.info(f"Datos recibidos de {cfg['name']}: {line}")

            if cfg['tipo'] == 'completo':
                # Verificar si es inicio de movimiento
                if re.search(cfg['pat_inicio'], line):
                    timestamp = datetime.datetime.now()
                    logger.info(f"{cfg['name']}: Inicio de movimiento detectado a las {timestamp}")
                    
                    # Guardar información del inicio para procesarlo después
                    pending_events[cfg['name']] = {
                        'timestamp': timestamp,
                        'camera_id': cfg['camera_id'],
                        'camera_ip': cfg['camera_ip'],
                        'ubicacion': cfg['ubicacion']
                    }
                
                # Verificar si es fin de movimiento y capturar la duración
                duration_match = re.search(cfg['pat_fin'], line)
                if duration_match and cfg['name'] in pending_events:
                    duration = int(duration_match.group(1))
                    logger.info(f"{cfg['name']}: Fin de movimiento detectado, duración = {duration}s")
                    
                    # Obtener datos del evento pendiente
                    event_data = pending_events[cfg['name']]
                    
                    # Determinar la descripción basada en la duración
                    descripcion = get_description_by_duration(event_data['ubicacion'], duration)
                    
                    # Registrar el evento completo ahora que conocemos la duración
                    record_complete_motion_event(
                        conn, 
                        event_data['camera_id'],
                        event_data['camera_ip'],
                        descripcion,
                        duration
                    )
                    
                    # Eliminar el evento pendiente
                    del pending_events[cfg['name']]

        except serial.SerialException as se:
            logger.error(f"Error en puerto serie {cfg['name']}: {se}")
            if ser and ser.is_open:
                ser.close()
                ser = None
            time.sleep(5)  # Esperar antes de reintentar
            
        except Exception as e:
            logger.error(f"Error en {cfg['name']}: {e}")
            if ser and ser.is_open:
                ser.close()
                ser = None
            time.sleep(2)

# Main
def main():
    conn = connect_db()
    if not conn:
        logger.error("No se pudo conectar a la base de datos. Saliendo...")
        return

    # Verificar que existen las tablas necesarias
    try:
        cur = conn.cursor()
        
        # Verificar tabla eventos_movimiento
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'eventos_movimiento')")
        if not cur.fetchone()[0]:
            logger.error("No existe la tabla eventos_movimiento. Asegúrate de crear la base de datos correctamente.")
            conn.close()
            return
            
        # Verificar tabla conteo_movimientos
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conteo_movimientos')")
        if not cur.fetchone()[0]:
            logger.info("Creando tabla conteo_movimientos...")
            cur.execute("""
            CREATE TABLE conteo_movimientos (
              id_conteo SERIAL PRIMARY KEY,
              id_camara INTEGER REFERENCES camaras(id_camara) ON DELETE SET NULL,
              fecha DATE NOT NULL,
              cantidad_movimientos INTEGER DEFAULT 0,
              hora_pico TIME
            );
            """)
            
        # Verificar tabla duracion_movimiento
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'duracion_movimiento')")
        if not cur.fetchone()[0]:
            logger.info("Creando tabla duracion_movimiento...")
            cur.execute("""
            CREATE TABLE duracion_movimiento (
              id_duracion SERIAL PRIMARY KEY,
              id_evento INTEGER REFERENCES eventos_movimiento(id_evento) ON DELETE CASCADE,
              duracion_segundos INTEGER NOT NULL
            );
            """)
            
        conn.commit()
    except Error as e:
        logger.error(f"Error al verificar/crear tablas: {e}")
        conn.close()
        return

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
        logger.info("Terminando programa...")
        conn.close()

if __name__ == '__main__':
    main()