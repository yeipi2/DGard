import serial
import time
import datetime
import re
import psycopg2
from psycopg2 import Error
import threading
import logging

# Configure custom formatter to handle microseconds
class MicrosecondFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        # Create a datetime object from the record's created time
        dt = datetime.datetime.fromtimestamp(record.created)
        # Format with microseconds
        if datefmt:
            s = dt.strftime(datefmt)
        else:
            s = dt.strftime('%Y-%m-%d %H:%M:%S.%f')
        return s

# Configure logging with custom formatter
logger = logging.getLogger()
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = MicrosecondFormatter('[%(asctime)s] %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Clear any existing handlers (important when re-running the script)
if logger.hasHandlers():
    logger.handlers.clear()
logger.addHandler(handler)

# Rest of your code remains the same...
# Configuración de la base de datos PostgreSQL
DB_CONFIG = {
    'dbname': 'DGard',
    'user': 'postgres',
    'password': '',
    'host': 'localhost',
}

# Serial Configuration for each ESP32
ESP32_CONFIG = [
    {
        'name': 'ESP32-PIR',
        'port': 'COM7',
        'baud': 9600,
        'camera_id': 7,  # ID in the database for 'Entrada principal'
        'camera_ip': 'http://19'
        '2.168.137.196/stream',
        'pattern': r"Movimiento detectado"  # Main pattern to look for
    },
    {
        'name': 'ESP32-CAM',
        'port': 'COM8',
        'baud': 115200,
        'camera_id': 8,  # ID in the database for 'Estacionamiento'
        'camera_ip': 'http://192.168.137.197/stream',
        'pattern': r"¡MOVIMIENTO CONFIRMADO!"  # Only record confirmed movements
    }
]

def connect_to_database():
    """Establish connection to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        logger.info("Connected to the database successfully")
        return conn
    except Error as e:
        logger.error(f"Error connecting to PostgreSQL: {e}")
        return None

def record_motion_event(conn, camera_id, camera_ip):
    """Record a motion detection event in the database"""
    try:
        cursor = conn.cursor()
        
        # Current date and time
        current_date = datetime.date.today()
        current_time = datetime.datetime.now().time()
        
        # Insert event into database
        cursor.execute(
            "INSERT INTO eventos_movimiento (id_camara, fecha_evento, hora_evento, descripcion, ip_sensor) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id_evento",
            (camera_id, current_date, current_time, "Movimiento detectado por sensor", camera_ip)
        )
        
        event_id = cursor.fetchone()[0]
        conn.commit()
        logger.info(f"Motion event recorded successfully! Event ID: {event_id} for camera ID: {camera_id}")
        return event_id
    except Error as e:
        if conn:
            conn.rollback()
        logger.error(f"Error recording motion event: {e}")
        return None

def monitor_serial(esp_config, db_conn):
    """Monitor a specific serial port for motion detection events"""
    device_name = esp_config['name']
    port = esp_config['port']
    baud = esp_config['baud']
    camera_id = esp_config['camera_id']
    camera_ip = esp_config['camera_ip']
    pattern = esp_config['pattern']
    
    logger.info(f"Starting monitor for {device_name} on {port} at {baud} baud")
    
    while True:
        try:
            # Try to open the serial port
            ser = serial.Serial(port, baud, timeout=1)
            logger.info(f"Connected to {device_name} on {port}")
            
            # Flush input buffer
            ser.flushInput()
            
            # Read serial data
            while True:
                try:
                    if ser.in_waiting > 0:
                        line = ser.readline().decode('utf-8', errors='replace').strip()
                        
                        # Only log and process relevant motion detection messages
                        if re.search(pattern, line, re.IGNORECASE):
                            logger.info(f"[{device_name}] {line}")
                            record_motion_event(db_conn, camera_id, camera_ip)
                    else:
                        # Small delay to prevent CPU hogging
                        time.sleep(0.1)
                except Exception as e:
                    logger.error(f"Error reading from {device_name}: {e}")
                    break
                    
        except serial.SerialException as e:
            logger.error(f"Error connecting to {device_name} on {port}: {e}")
            # Wait before retrying connection
            time.sleep(5)
            
        finally:
            # Close serial port if open
            if 'ser' in locals() and ser.is_open:
                ser.close()
                logger.info(f"Closed connection to {device_name}")
            
            # Small delay before reconnection attempt
            time.sleep(2)

def main():
    """Main function to start monitoring all ESP32 devices"""
    # Connect to database
    db_conn = connect_to_database()
    if not db_conn:
        logger.error("Exiting due to database connection failure")
        return
    
    # Create threads for each ESP32 device
    threads = []
    for esp_config in ESP32_CONFIG:
        thread = threading.Thread(
            target=monitor_serial,
            args=(esp_config, db_conn),
            daemon=True
        )
        threads.append(thread)
        thread.start()
        logger.info(f"Started monitoring thread for {esp_config['name']}")
    
    # Keep the main thread alive
    try:
        while True:
            # Check if all threads are still running
            all_alive = all(thread.is_alive() for thread in threads)
            if not all_alive:
                logger.error("One or more monitoring threads died. Restarting...")
                # Restart dead threads (implementation left as an exercise)
            
            # Check database connection health
            try:
                cursor = db_conn.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
            except Exception as e:
                logger.error(f"Database connection error: {e}")
                logger.info("Reconnecting to database...")
                db_conn = connect_to_database()
            
            time.sleep(60)  # Check every minute
            
    except KeyboardInterrupt:
        logger.info("Program terminated by user")
    finally:
        # Clean up database connection
        if db_conn:
            db_conn.close()
            logger.info("Database connection closed")

if __name__ == "__main__":
    main()