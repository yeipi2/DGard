// Configuración básica
const CONFIG = {
    // Tiempo de espera para determinar si una cámara está online (en ms)
    connectionTimeout: 8000  // 8 segundos
};

// Cache simple de estado de las cámaras
const cameraStates = {};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes básicos
    updateClocks();
    setInterval(updateClocks, 1000);
    
    // Configurar grid de cámaras
    adjustGrid();
    window.addEventListener('resize', adjustGrid);
    
    // Configurar botones de refresh
    setupRefreshButtons();
    
    // Auto-ocultar mensajes flash
    setupFlashMessages();
    
    // Inicializar todas las cámaras (solo primera carga)
    initializeCameras();
});

// Actualizar todos los relojes en la página
function updateClocks() {
    const now = new Date();
    const formattedDateTime = now.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Actualizar reloj principal
    document.getElementById('current-time').textContent = formattedDateTime;
    
    // Actualizar reloj en cada cámara
    document.querySelectorAll('.camera-time').forEach(timeElement => {
        timeElement.textContent = formattedDateTime;
    });
}

// Configurar mensajes flash
function setupFlashMessages() {
    setTimeout(() => {
        document.querySelectorAll('#flash-messages > div').forEach(msg => {
            msg.style.display = 'none';
        });
    }, 5000);
}

// Ajustar el diseño de la cuadrícula según el número de cámaras
function adjustGrid() {
    const camerasGrid = document.getElementById('cameras-grid');
    if (!camerasGrid) return;
    
    const cameras = Array.from(camerasGrid.querySelectorAll('.camera-container'));
    const cameraCount = cameras.length;
    
    // Eliminar clases anteriores
    camerasGrid.classList.remove('grid-1', 'grid-2', 'grid-3', 'grid-4');
    
    // Asignar la clase apropiada según el número de cámaras
    if (cameraCount === 1) {
        camerasGrid.classList.add('grid-1');
    } else if (cameraCount === 2) {
        camerasGrid.classList.add('grid-2');
    } else if (cameraCount === 3) {
        camerasGrid.classList.add('grid-3');
    } else if (cameraCount === 4) {
        camerasGrid.classList.add('grid-4');
    } else if (cameraCount > 4) {
        // Para más de 4, usamos una cuadrícula de 3 columnas por defecto
        camerasGrid.classList.add('grid-3');
    }
}

// Funciones para manejar el estado de las cámaras - versión simplificada
function handleCameraOnline(imgElement) {
    const cameraContainer = imgElement.closest('.camera-container');
    const statusDot = cameraContainer.querySelector('.status-dot');
    const statusText = cameraContainer.querySelector('.status-text');
    const checkingDiv = cameraContainer.querySelector('.cam-checking');
    const offlineImg = cameraContainer.querySelector('.cam-offline');
    
    // Mostrar imagen de cámara y ocultar otros elementos
    checkingDiv.style.display = 'none';
    offlineImg.style.display = 'none';
    imgElement.style.display = 'block';
    
    // Actualizar indicadores de estado
    statusDot.classList.remove('checking', 'offline');
    statusDot.classList.add('online');
    statusText.textContent = 'Online';
}

function handleCameraOffline(imgElement) {
    const cameraContainer = imgElement.closest('.camera-container');
    const statusDot = cameraContainer.querySelector('.status-dot');
    const statusText = cameraContainer.querySelector('.status-text');
    const checkingDiv = cameraContainer.querySelector('.cam-checking');
    const offlineImg = cameraContainer.querySelector('.cam-offline');
    
    // Mostrar imagen offline
    imgElement.style.display = 'none';
    checkingDiv.style.display = 'none';
    
    // Forzar visibilidad de imagen offline
    offlineImg.classList.remove('hidden');
    offlineImg.style.display = 'block';
    
    // Opcional: Verificar si la imagen se cargó correctamente
    console.log("Imagen offline:", offlineImg.complete ? "cargada" : "no cargada");
    
    // Actualizar indicadores de estado
    statusDot.classList.remove('checking', 'online');
    statusDot.classList.add('offline');
    statusText.textContent = 'Offline';
}

// Configurar botones de recarga manual - versión simplificada
function setupRefreshButtons() {
    document.querySelectorAll('.refresh-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const cameraContainer = this.closest('.camera-container');
            const cameraIP = cameraContainer.querySelector('.camera-stream').getAttribute('data-camera-ip');
            
            // Mostrar animación en el botón
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            // Actualizar a estado verificando
            const streamImg = cameraContainer.querySelector('.camera-stream');
            const offlineImg = cameraContainer.querySelector('.cam-offline');
            const checkingDiv = cameraContainer.querySelector('.cam-checking');
            const statusDot = cameraContainer.querySelector('.status-dot');
            const statusText = cameraContainer.querySelector('.status-text');
            
            streamImg.style.display = 'none';
            offlineImg.style.display = 'none';
            checkingDiv.style.display = 'flex';
            
            statusDot.classList.remove('online', 'offline');
            statusDot.classList.add('checking');
            statusText.textContent = 'Verificando...';
            
            // Intentar cargar nueva imagen
            const timestamp = Date.now();
            streamImg.src = `http://${cameraIP}/stream?t=${timestamp}`;
            
            // Restaurar el botón después de un tiempo
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-sync-alt"></i>';
            }, 2000);
        });
    });
}

// Inicializar todas las cámaras - versión simplificada
function initializeCameras() {
    const cameras = document.querySelectorAll('.camera-container');
    
    cameras.forEach((cameraContainer) => {
        // Configurar estado visual inicial "verificando" para cada cámara
        const streamImg = cameraContainer.querySelector('.camera-stream');
        const offlineImg = cameraContainer.querySelector('.cam-offline');
        const checkingDiv = cameraContainer.querySelector('.cam-checking');
        const statusDot = cameraContainer.querySelector('.status-dot');
        const statusText = cameraContainer.querySelector('.status-text');
        
        // Mostrar estado verificando (inicialmente)
        streamImg.style.display = 'none';
        offlineImg.style.display = 'none';
        checkingDiv.style.display = 'flex';
        
        // Añadir explícitamente la clase checking
        statusDot.classList.remove('online', 'offline');
        statusDot.classList.add('checking');
        statusText.textContent = 'Verificando...';
        
        // La carga o error de la imagen actualizará el estado
        // Las funciones handleCameraOnline/handleCameraOffline se encargarán después
    });
}
