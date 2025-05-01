// Sistema de notificaciones reactivo para panel.js
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes interactivos
    initializeDropdowns();
    
    // Configurar notificaciones - utilizando el sistema de reportes.js
    setupNotifications();
    
    initializeFlashMessages();

    updateNotificationCounter();
    
    // Configurar intervalo para verificar nuevas alertas (cada 10 segundos)
    setInterval(loadNotifications, 10000);
});

function updateNotificationCounter() {
    // Obtener el valor del contador directamente del HTML inicial
    const notificationCount = document.querySelector('#notifications-btn span');
    
    // Si ya hay un valor en el contador (desde el servidor)
    if (notificationCount && notificationCount.textContent.trim() !== '') {
        // Asegurarse de que sea visible eliminando la clase 'hidden'
        notificationCount.classList.remove('hidden');
    } else if (notificationCount) {
        // Si no hay valor, añadir la clase 'hidden'
        notificationCount.classList.add('hidden');
    }
}

// Manejo de dropdowns
function initializeDropdowns() {
    // Dropdown de usuario
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function() {
            userDropdown.classList.toggle('hidden');
        });
        
        // Cerrar el dropdown al hacer clic fuera de él
        document.addEventListener('click', function(event) {
            if (!userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }
    
    // Dropdown de notificaciones (si existe)
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    
    if (notificationsBtn && notificationsDropdown) {
        notificationsBtn.addEventListener('click', function() {
            loadNotifications(); // Cargar notificaciones al hacer clic
            notificationsDropdown.classList.toggle('hidden');
        });
        
        // Cerrar el dropdown al hacer clic fuera de él
        document.addEventListener('click', function(event) {
            if (!notificationsBtn.contains(event.target) && !notificationsDropdown.contains(event.target)) {
                notificationsDropdown.classList.add('hidden');
            }
        });
    }
}

function initializeFlashMessages() {
    // Configurar el botón de cierre para todos los mensajes flash
    const closeButtons = document.querySelectorAll('#flash-messages .close-flash');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const flashMessage = this.closest('.flash-message');
            if (flashMessage) {
                fadeOutAndRemove(flashMessage);
            }
        });
    });
    
    // Configurar autoclose después de 5 segundos
    const flashMessages = document.querySelectorAll('#flash-messages .flash-message');
    setTimeout(function() {
        flashMessages.forEach(message => {
            fadeOutAndRemove(message);
        });
    }, 5000);
}

function fadeOutAndRemove(element) {
    element.style.animation = 'fadeOut 0.5s ease forwards';
    
    // Eliminar el elemento después de que termine la animación
    setTimeout(function() {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, 500);
}

// Sistema de notificaciones adaptado desde reportes.js
function setupNotifications() {
    // Cargar notificaciones al iniciar
    loadNotifications();
    
    // Configurar intervalo para recargar notificaciones cada 30 segundos
    setInterval(loadNotifications, 30000);
}

// Cargar notificaciones desde el servidor (adaptado de reportes.js)
function loadNotifications() {
    fetch('/alertas/obtener')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar notificaciones');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateNotificationsDropdown(data.alerts);
                
                // Actualizar contador de notificaciones
                const notificationCount = document.querySelector('#notifications-btn span');
                if (data.count > 0) {
                    notificationCount.textContent = data.count;
                    notificationCount.classList.remove('hidden');
                } else {
                    notificationCount.textContent = '';
                    notificationCount.classList.add('hidden');
                }
                
                // Actualizar el panel principal de alertas si existe
                updateMainAlertsPanel(data.alerts);
                
                // Si hay alertas nuevas y no es la primera carga, mostrar notificación visual
                if (window.lastAlertCount !== undefined && data.count > window.lastAlertCount) {
                    showNewAlertNotification();
                }
                
                // Guardar la cantidad actual para la próxima comparación
                window.lastAlertCount = data.count;
            }
        })
        .catch(error => {
            console.error('Error al cargar notificaciones:', error);
        });
}

// Actualizar dropdown de notificaciones (versión mejorada)
function updateNotificationsDropdown(alerts) {
    const dropdown = document.getElementById('notifications-dropdown');
    
    if (!dropdown) return;
    
    if (!alerts || alerts.length === 0) {
        dropdown.innerHTML = `
            <div class="py-4 px-4 text-sm text-gray-700 text-center">
                <div class="flex flex-col items-center">
                    <i class="fas fa-bell-slash text-gray-400 text-2xl mb-2"></i>
                    <p>No hay notificaciones nuevas</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="bg-gray-100 py-2 px-4 text-xs font-semibold text-gray-600 uppercase sticky top-0">
            Alertas Recientes
        </div>
    `;
    
    alerts.forEach(alert => {
        html += `
            <div class="notification-item">
                <div class="px-4 py-3">
                    <div class="flex justify-between items-center">
                        <span class="font-semibold text-sm">${alert.nombre_posicion}</span>
                        <span class="text-xs text-gray-500">${alert.fecha_evento} ${alert.hora_evento}</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">${alert.descripcion}</p>
                    <div class="mt-2">
                        <button 
                            class="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-1 px-2 rounded transition-colors" 
                            onclick="markAlertAsReviewed(${alert.id_evento})"
                        >
                            Marcar como revisada
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="py-2 px-4 text-center border-t border-gray-100 sticky bottom-0 bg-white">
            <a href="/reportes" class="text-xs font-medium text-blue-600 hover:text-blue-800">
                Ver todas las alertas
            </a>
        </div>
    `;
    
    dropdown.innerHTML = html;
}

// Actualizar el panel principal de alertas si existe
function updateMainAlertsPanel(alerts) {
    const alertsContainer = document.querySelector('.alertas-container');
    
    if (!alertsContainer) return;
    
    if (!alerts || alerts.length === 0) {
        alertsContainer.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <i class="fas fa-bell-slash text-2xl mb-2"></i>
                <p>No hay alertas recientes</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    alerts.forEach((alert, index) => {
        const isOdd = index % 2 === 0;
        const bgColor = isOdd ? 'bg-yellow-50 border-l-4 border-yellow-500' : 'bg-red-50 border-l-4 border-red-500';
        const textColor = isOdd ? 'text-yellow-500' : 'text-red-500';
        const iconClass = isOdd ? 'exclamation-triangle' : 'exclamation-circle';
        
        html += `
            <div class="flex items-center p-3 ${bgColor} rounded mb-2" data-id="${alert.id_evento}">
                <div class="${textColor} mr-3">
                    <i class="fas fa-${iconClass} text-xl"></i>
                </div>
                <div>
                    <h4 class="font-semibold">${alert.descripcion || "Movimiento detectado"}</h4>
                    <p class="text-sm text-gray-600">${alert.nombre_posicion} - ${formatDate(alert.fecha_evento)} ${formatTime(alert.hora_evento)}</p>
                </div>
                <button class="ml-auto text-gray-500 hover:text-gray-700 dismiss-alert" data-id="${alert.id_evento}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    alertsContainer.innerHTML = html;
    
    // Configurar eventos para los botones de descartar
    setupDismissButtons();
}

// Marcar alerta como revisada (adaptado de reportes.js)
function markAlertAsReviewed(alertId) {
    fetch('/alertas/marcar-revisada', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_evento: alertId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Recargar notificaciones
            loadNotifications();
            
            // Mostrar mensaje de éxito
            showSuccess('Alerta marcada como revisada');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Error al marcar la alerta como revisada');
    });
}

// Configurar botones para descartar alertas
function setupDismissButtons() {
    const dismissButtons = document.querySelectorAll('.dismiss-alert');
    
    dismissButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            markAlertAsReviewed(id);
        });
    });
}

// Mostrar notificación de nueva alerta
function showNewAlertNotification() {
    // Crear un elemento temporal para mostrar la notificación
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md z-50 fade-in';
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="mr-3">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div>
                <p class="font-bold">¡Nueva alerta detectada!</p>
                <p>Se ha detectado actividad en una de tus cámaras.</p>
            </div>
            <button class="ml-6 text-red-500 hover:text-red-700" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Reproducir sonido de alerta si está disponible
    playAlertSound();
    
    // Remover la notificación después de 5 segundos
    setTimeout(function() {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Reproducir sonido de alerta
function playAlertSound() {
    try {
        const audio = new Audio('/static/sounds/alert.mp3');
        audio.play().catch(e => console.log('No se pudo reproducir el sonido de alerta'));
    } catch (e) {
        console.log('Audio no soportado');
    }
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// Formatear hora
function formatTime(timeString) {
    if (!timeString) return '';
    
    try {
        if (typeof timeString === 'string' && timeString.includes(':')) {
            const parts = timeString.split(':');
            return `${parts[0]}:${parts[1]}`;
        }
        return timeString;
    } catch (e) {
        return timeString;
    }
}

// Mostrar mensaje de éxito temporal (adaptado de reportes.js)
function showSuccess(message) {
    const flashContainer = document.getElementById('flash-messages');
    const alert = document.createElement('div');
    
    alert.className = 'bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-2 rounded shadow-md fade-in';
    alert.innerHTML = `
        <p>${message}</p>
        <button type="button" class="float-right" onclick="this.parentElement.remove();">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    flashContainer.appendChild(alert);
    
    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Mostrar mensaje de error temporal (adaptado de reportes.js)
function showError(message) {
    const flashContainer = document.getElementById('flash-messages');
    const alert = document.createElement('div');
    
    alert.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-2 rounded shadow-md fade-in';
    alert.innerHTML = `
        <p>${message}</p>
        <button type="button" class="float-right" onclick="this.parentElement.remove();">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    flashContainer.appendChild(alert);
    
    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Mostrar indicador de carga
function showLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"></div>';
    loadingOverlay.id = 'loading-overlay';
    
    document.body.appendChild(loadingOverlay);
}

// Ocultar indicador de carga
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

// Agregar animaciones CSS para efectos fade-in/fade-out
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        animation: fadeIn 0.3s ease-in-out;
    }
    
    .fade-out {
        animation: fadeOut 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
    
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top-color: #3498db;
        animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    #notifications-btn .absolute:not(.hidden) {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
`;
document.head.appendChild(style);