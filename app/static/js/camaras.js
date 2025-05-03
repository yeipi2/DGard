// Configuración básica
const CONFIG = {
    // Tiempo de espera para determinar si una cámara está online (en ms)
    connectionTimeout: 8000,  // 8 segundos
    // Intervalo de actualización para cámaras en pantalla completa (en ms)
    fullscreenRefreshInterval: 10000 // 10 segundos
};

// Cache simple de estado de las cámaras
const cameraStates = {};
// Variable para el intervalo de actualización en pantalla completa
let fullscreenRefreshIntervalId = null;
// Almacena la IP de la cámara actual en pantalla completa
let currentFullscreenCameraIP = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado - inicializando sistema de cámaras");
    
    // Inicializar componentes básicos
    updateClocks();
    setInterval(updateClocks, 1000);
    
    // Configurar grid de cámaras
    adjustGrid();
    window.addEventListener('resize', adjustGrid);
    
    // Configurar botones de refresh
    setupRefreshButtons();
    
    // Configurar botones de pantalla completa
    setupFullscreenButtons();
    
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
    const currentTimeElement = document.getElementById('current-time');
    if (currentTimeElement) {
        currentTimeElement.textContent = formattedDateTime;
    }
    
    // Actualizar reloj en cada cámara
    document.querySelectorAll('.camera-time').forEach(timeElement => {
        timeElement.textContent = formattedDateTime;
    });

    // Actualizar reloj en vista pantalla completa si está visible
    const fullscreenTimeElement = document.getElementById('fullscreen-time');
    if (fullscreenTimeElement && document.getElementById('fullscreen-view').style.display !== 'none') {
        fullscreenTimeElement.textContent = formattedDateTime;
    }
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

// Funciones para manejar el estado de las cámaras
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

    // Guardar estado de la cámara
    const cameraIP = imgElement.getAttribute('data-camera-ip');
    cameraStates[cameraIP] = 'online';

    // Actualizar estado en pantalla completa si es la misma cámara
    updateFullscreenCameraStatus(cameraIP, 'online');
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

    // Guardar estado de la cámara
    const cameraIP = imgElement.getAttribute('data-camera-ip');
    cameraStates[cameraIP] = 'offline';

    // Actualizar estado en pantalla completa si es la misma cámara
    updateFullscreenCameraStatus(cameraIP, 'offline');
}

// Configurar botones de recarga manual
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

    // Configurar botón de refresh en pantalla completa
    const refreshFullscreenBtn = document.getElementById('refresh-fullscreen');
    if (refreshFullscreenBtn) {
        refreshFullscreenBtn.addEventListener('click', function() {
            if (!currentFullscreenCameraIP) return;
            
            // Mostrar animación en el botón
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            // Cambiar a estado verificando
            const fullscreenImage = document.getElementById('fullscreen-image');
            const fullscreenOffline = document.getElementById('fullscreen-offline');
            const fullscreenChecking = document.getElementById('fullscreen-checking');
            const statusDot = document.querySelector('#fullscreen-status .status-dot');
            const statusText = document.getElementById('fullscreen-status-text');
            
            fullscreenImage.style.display = 'none';
            fullscreenOffline.style.display = 'none';
            fullscreenChecking.style.display = 'flex';
            
            statusDot.classList.remove('online', 'offline');
            statusDot.classList.add('checking');
            statusText.textContent = 'Verificando...';
            
            // Intentar cargar nueva imagen
            const timestamp = Date.now();
            fullscreenImage.src = `http://${currentFullscreenCameraIP}/stream?t=${timestamp}`;
            
            // Restaurar el botón después de un tiempo
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-sync-alt"></i>';
            }, 2000);
        });
    }
}

// Configurar botones de pantalla completa
function setupFullscreenButtons() {
    console.log("Configurando botones de pantalla completa");
    
    // Configurar botones para abrir pantalla completa
    document.querySelectorAll('.fullscreen-btn').forEach(btn => {
        btn.addEventListener('click', function(event) {
            // Prevenir comportamiento por defecto
            event.preventDefault();
            event.stopPropagation();
            
            console.log("Botón de pantalla completa clickeado");
            
            const cameraContainer = this.closest('.camera-container');
            const streamImg = cameraContainer.querySelector('.camera-stream');
            const cameraIP = streamImg.getAttribute('data-camera-ip');
            const cameraName = streamImg.getAttribute('data-camera-name') || 'Cámara';
            
            console.log("Abriendo cámara:", cameraName, "IP:", cameraIP);
            
            // Guardar IP de la cámara actual en pantalla completa
            currentFullscreenCameraIP = cameraIP;
            
            // Configurar título
            document.getElementById('fullscreen-title').textContent = cameraName;
            
            // Determinar el estado actual de la cámara
            const currentState = cameraStates[cameraIP] || 'checking';
            console.log("Estado actual de la cámara:", currentState);
            
            // Configurar imagen según el estado
            const fullscreenImage = document.getElementById('fullscreen-image');
            const fullscreenOffline = document.getElementById('fullscreen-offline');
            const fullscreenChecking = document.getElementById('fullscreen-checking');
            const statusDot = document.querySelector('#fullscreen-status .status-dot');
            const statusText = document.getElementById('fullscreen-status-text');
            
            // Ocultar todos los elementos primero
            fullscreenImage.style.display = 'none';
            fullscreenOffline.style.display = 'none';
            fullscreenChecking.style.display = 'none';
            
            // Mostrar el elemento adecuado según el estado
            if (currentState === 'online') {
                const timestamp = Date.now();
                fullscreenImage.src = `http://${cameraIP}/stream?t=${timestamp}`;
                fullscreenImage.style.display = 'block';
                
                statusDot.classList.remove('checking', 'offline');
                statusDot.classList.add('online');
                statusText.textContent = 'Online';
            } else if (currentState === 'offline') {
                fullscreenOffline.style.display = 'block';
                
                statusDot.classList.remove('checking', 'online');
                statusDot.classList.add('offline');
                statusText.textContent = 'Offline';
            } else {
                fullscreenChecking.style.display = 'flex';
                
                statusDot.classList.remove('online', 'offline');
                statusDot.classList.add('checking');
                statusText.textContent = 'Verificando...';
                
                // Intentar cargar imagen
                const timestamp = Date.now();
                fullscreenImage.src = `http://${cameraIP}/stream?t=${timestamp}`;
            }
            
            // Mostrar pantalla completa
            const fullscreenView = document.getElementById('fullscreen-view');
            fullscreenView.style.display = 'flex';
            console.log("Vista de pantalla completa mostrada");
            
            // Iniciar temporizador para actualizar periódicamente la imagen
            if (currentState === 'online') {
                startFullscreenRefreshInterval();
            }
            
            // Configurar handlers para carga/error de la imagen
            setupFullscreenImageHandlers();
        });
    });
    
    // Configurar botón para cerrar pantalla completa
    const closeFullscreenBtn = document.getElementById('close-fullscreen');
    if (closeFullscreenBtn) {
        closeFullscreenBtn.addEventListener('click', function() {
            console.log("Cerrando vista de pantalla completa");
            document.getElementById('fullscreen-view').style.display = 'none';
            currentFullscreenCameraIP = null;
            
            // Detener el intervalo de actualización
            if (fullscreenRefreshIntervalId) {
                clearInterval(fullscreenRefreshIntervalId);
                fullscreenRefreshIntervalId = null;
            }
        });
    } else {
        console.error("El botón para cerrar pantalla completa no existe");
    }
}

// Configurar manejadores de eventos para la imagen en pantalla completa
function setupFullscreenImageHandlers() {
    const fullscreenImage = document.getElementById('fullscreen-image');
    
    // Manejador para cuando la imagen carga correctamente
    fullscreenImage.onload = function() {
        const fullscreenOffline = document.getElementById('fullscreen-offline');
        const fullscreenChecking = document.getElementById('fullscreen-checking');
        const statusDot = document.querySelector('#fullscreen-status .status-dot');
        const statusText = document.getElementById('fullscreen-status-text');
        
        // Mostrar imagen y ocultar otros elementos
        fullscreenImage.style.display = 'block';
        fullscreenOffline.style.display = 'none';
        fullscreenChecking.style.display = 'none';
        
        // Actualizar indicadores de estado
        statusDot.classList.remove('checking', 'offline');
        statusDot.classList.add('online');
        statusText.textContent = 'Online';
        
        // Actualizar estado
        if (currentFullscreenCameraIP) {
            cameraStates[currentFullscreenCameraIP] = 'online';
        }
    };
    
    // Manejador para cuando hay un error al cargar la imagen
    fullscreenImage.onerror = function() {
        const fullscreenOffline = document.getElementById('fullscreen-offline');
        const fullscreenChecking = document.getElementById('fullscreen-checking');
        const statusDot = document.querySelector('#fullscreen-status .status-dot');
        const statusText = document.getElementById('fullscreen-status-text');
        
        // Ocultar imagen y mostrar imagen offline
        fullscreenImage.style.display = 'none';
        fullscreenOffline.style.display = 'block';
        fullscreenChecking.style.display = 'none';
        
        // Actualizar indicadores de estado
        statusDot.classList.remove('checking', 'online');
        statusDot.classList.add('offline');
        statusText.textContent = 'Offline';
        
        // Actualizar estado
        if (currentFullscreenCameraIP) {
            cameraStates[currentFullscreenCameraIP] = 'offline';
        }
    };
}

// Iniciar intervalo de actualización para la cámara en pantalla completa
function startFullscreenRefreshInterval() {
    // Detener intervalo anterior si existe
    if (fullscreenRefreshIntervalId) {
        clearInterval(fullscreenRefreshIntervalId);
    }
    
    // Crear nuevo intervalo
    fullscreenRefreshIntervalId = setInterval(() => {
        if (!currentFullscreenCameraIP) return;
        
        // Solo actualizar si la vista está visible
        if (document.getElementById('fullscreen-view').style.display === 'none') {
            clearInterval(fullscreenRefreshIntervalId);
            fullscreenRefreshIntervalId = null;
            return;
        }
        
        // Solo actualizar si el estado es online
        if (cameraStates[currentFullscreenCameraIP] === 'online') {
            const fullscreenImage = document.getElementById('fullscreen-image');
            const timestamp = Date.now();
            fullscreenImage.src = `http://${currentFullscreenCameraIP}/stream?t=${timestamp}`;
        }
    }, CONFIG.fullscreenRefreshInterval);
}

// Actualizar estado en pantalla completa si es la misma cámara
function updateFullscreenCameraStatus(cameraIP, status) {
    if (cameraIP !== currentFullscreenCameraIP) return;
    
    const fullscreenImage = document.getElementById('fullscreen-image');
    const fullscreenOffline = document.getElementById('fullscreen-offline');
    const fullscreenChecking = document.getElementById('fullscreen-checking');
    const statusDot = document.querySelector('#fullscreen-status .status-dot');
    const statusText = document.getElementById('fullscreen-status-text');
    
    if (status === 'online') {
        fullscreenImage.style.display = 'block';
        fullscreenOffline.style.display = 'none';
        fullscreenChecking.style.display = 'none';
        
        statusDot.classList.remove('checking', 'offline');
        statusDot.classList.add('online');
        statusText.textContent = 'Online';
    } else if (status === 'offline') {
        fullscreenImage.style.display = 'none';
        fullscreenOffline.style.display = 'block';
        fullscreenChecking.style.display = 'none';
        
        statusDot.classList.remove('checking', 'online');
        statusDot.classList.add('offline');
        statusText.textContent = 'Offline';
    }
}

// Inicializar todas las cámaras
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
    });
}