// Variables para mantener las instancias de las gráficas
let barChart = null;
let pieChart = null;
let lineChart = null;

// Colores para las gráficas
const chartColors = {
    blue: 'rgba(54, 162, 235, 0.8)',
    blueLight: 'rgba(54, 162, 235, 0.2)',
    green: 'rgba(75, 192, 192, 0.8)',
    greenLight: 'rgba(75, 192, 192, 0.2)',
    red: 'rgba(255, 99, 132, 0.8)',
    redLight: 'rgba(255, 99, 132, 0.2)',
    yellow: 'rgba(255, 206, 86, 0.8)',
    yellowLight: 'rgba(255, 206, 86, 0.2)',
    purple: 'rgba(153, 102, 255, 0.8)',
    purpleLight: 'rgba(153, 102, 255, 0.2)',
    orange: 'rgba(255, 159, 64, 0.8)',
    orangeLight: 'rgba(255, 159, 64, 0.2)'
};

// Inicialización cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Configuración de eventos para elementos de la UI
    setupUIInteractions();
    
    // Carga los datos iniciales para las gráficas
    loadReportData();
    
    // Inicializar notificaciones
    setupNotifications();
    updateNotificationCounter();
});

// Configurar interacciones de la UI
function setupUIInteractions() {
    const dateRangeSelect = document.getElementById('date-range');
    const customDateContainer = document.getElementById('custom-date-container');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const closeReportModalBtn = document.getElementById('close-report-modal');
    const cancelReportBtn = document.getElementById('cancel-report');
    const reportForm = document.getElementById('report-form');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    
    // Mostrar/ocultar fechas personalizadas según el rango seleccionado
    dateRangeSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDateContainer.classList.remove('hidden');
        } else {
            customDateContainer.classList.add('hidden');
        }
    });
    
    // Aplicar filtros y recargar datos
    applyFiltersBtn.addEventListener('click', function() {
        loadReportData();
    });
    
    // Mostrar modal de generación de reportes
    generateReportBtn.addEventListener('click', function() {
        document.getElementById('report-modal').classList.remove('hidden');
    });
    
    // Cerrar modal de reportes
    closeReportModalBtn.addEventListener('click', function() {
        document.getElementById('report-modal').classList.add('hidden');
    });
    
    // Cancelar generación de reporte
    cancelReportBtn.addEventListener('click', function() {
        document.getElementById('report-modal').classList.add('hidden');
    });
    
    // Enviar formulario de generación de reporte
    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        generateReport();
    });
    
    // Mostrar/ocultar dropdown de usuario
    userMenuBtn.addEventListener('click', function() {
        userDropdown.classList.toggle('hidden');
    });
    
    // Mostrar/ocultar dropdown de notificaciones
    notificationsBtn.addEventListener('click', function() {
        loadNotifications();
        notificationsDropdown.classList.toggle('hidden');
    });
    
    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }
        
        if (!notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
            notificationsDropdown.classList.add('hidden');
        }
    });
    
    // Establecer fechas por defecto (última semana)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    document.getElementById('start-date').value = formatDate(lastWeek);
    document.getElementById('end-date').value = formatDate(today);
}

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

// Formatear fecha para inputs date
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Cargar datos para reportes según los filtros seleccionados
function loadReportData() {
    const dateRange = document.getElementById('date-range').value;
    const cameraId = document.getElementById('camera-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    // Mostrar indicador de carga
    showLoading();
    
    // Construir parámetros de la URL
    const params = new URLSearchParams();
    params.append('range', dateRange);
    params.append('camera', cameraId);
    
    if (dateRange === 'custom') {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
    }
    
    // Realizar petición al servidor
    fetch(`/api/reportes/data?${params.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar datos');
            }
            return response.json();
        })
        .then(data => {
            // Actualizar estadísticas
            updateStats(data.stats);
            
            // Actualizar gráficas
            createOrUpdateCharts(data.charts);
            
            // Actualizar tabla de alertas
            updateAlertsTable(data.alerts);
            
            // Ocultar indicador de carga
            hideLoading();
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Error al cargar los datos del reporte. Por favor intente nuevamente.');
            hideLoading();
            
            // Cargar datos de ejemplo en caso de error
            loadDemoData();
        });
}

// Cargar datos de demostración para desarrollo
function loadDemoData() {
    // Datos de ejemplo para las gráficas
    const demoData = {
        stats: {
            total_alerts: 147,
            recent_alerts: 24,
            reviewed_alerts: 89
        },
        charts: {
            byDay: {
                labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
                data: [12, 19, 8, 15, 24, 10, 6]
            },
            byCamera: {
                labels: ['Entrada principal', 'Estacionamiento', 'Centro de datos'],
                data: [65, 40, 42]
            },
            trend: {
                labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
                datasets: [
                    {
                        label: 'Alertas',
                        data: [35, 42, 28, 42],
                        borderColor: chartColors.blue,
                        backgroundColor: chartColors.blueLight,
                    }
                ]
            }
        },
        alerts: [
            {
                nombre_posicion: 'Entrada principal',
                descripcion: 'Movimiento detectado - persona',
                fecha_evento: '2025-04-25',
                hora_evento: '14:32:18',
                revisado: false
            },
            {
                nombre_posicion: 'Estacionamiento',
                descripcion: 'Movimiento detectado - vehículo',
                fecha_evento: '2025-04-25',
                hora_evento: '13:15:42',
                revisado: true
            },
            {
                nombre_posicion: 'Centro de datos',
                descripcion: 'Movimiento detectado - persona',
                fecha_evento: '2025-04-24',
                hora_evento: '19:22:05',
                revisado: false
            },
            {
                nombre_posicion: 'Entrada principal',
                descripcion: 'Movimiento detectado - persona',
                fecha_evento: '2025-04-24',
                hora_evento: '16:48:33',
                revisado: true
            },
            {
                nombre_posicion: 'Centro de datos',
                descripcion: 'Movimiento detectado - persona',
                fecha_evento: '2025-04-23',
                hora_evento: '09:02:11',
                revisado: false
            }
        ]
    };
    
    // Actualizar la UI con los datos de demo
    updateStats(demoData.stats);
    createOrUpdateCharts(demoData.charts);
    updateAlertsTable(demoData.alerts);
}

// Actualizar contadores estadísticos
function updateStats(stats) {
    document.getElementById('total-alerts').textContent = stats.total_alerts;
    document.getElementById('recent-alerts').textContent = stats.recent_alerts;
    document.getElementById('reviewed-alerts').textContent = stats.reviewed_alerts;
}

// Crear o actualizar las gráficas
function createOrUpdateCharts(chartData) {
    // Gráfica de barras - Alertas por día
    const alertsByDayCtx = document.getElementById('alertsByDayChart').getContext('2d');
    
    if (barChart) {
        barChart.data.labels = chartData.byDay.labels;
        barChart.data.datasets[0].data = chartData.byDay.data;
        barChart.update();
    } else {
        barChart = new Chart(alertsByDayCtx, {
            type: 'bar',
            data: {
                labels: chartData.byDay.labels,
                datasets: [{
                    label: 'Alertas',
                    data: chartData.byDay.data,
                    backgroundColor: chartColors.blue,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
    
    // Gráfica circular - Distribución por cámara
    const cameraDistributionCtx = document.getElementById('cameraDistribution').getContext('2d');
    
    if (pieChart) {
        pieChart.data.labels = chartData.byCamera.labels;
        pieChart.data.datasets[0].data = chartData.byCamera.data;
        pieChart.update();
    } else {
        pieChart = new Chart(cameraDistributionCtx, {
            type: 'doughnut',
            data: {
                labels: chartData.byCamera.labels,
                datasets: [{
                    data: chartData.byCamera.data,
                    backgroundColor: [
                        chartColors.blue,
                        chartColors.green,
                        chartColors.red,
                        chartColors.yellow,
                        chartColors.purple,
                        chartColors.orange
                    ],
                    borderWidth: 1,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
    
    // Gráfica de línea - Tendencia de alertas
    const alertsTrendCtx = document.getElementById('alertsTrend').getContext('2d');
    
    if (lineChart) {
        lineChart.data.labels = chartData.trend.labels;
        lineChart.data.datasets = chartData.trend.datasets;
        lineChart.update();
    } else {
        lineChart = new Chart(alertsTrendCtx, {
            type: 'line',
            data: {
                labels: chartData.trend.labels,
                datasets: chartData.trend.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.3
                    }
                }
            }
        });
    }
}

// Actualizar tabla de alertas
function updateAlertsTable(alerts) {
    const tableBody = document.getElementById('alerts-table-body');
    
    if (!alerts || alerts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">No hay alertas disponibles</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    alerts.forEach(alert => {
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${alert.nombre_posicion}</td>
                <td class="px-6 py-4">${alert.descripcion}</td>
                <td class="px-6 py-4 whitespace-nowrap">${alert.fecha_evento}</td>
                <td class="px-6 py-4 whitespace-nowrap">${alert.hora_evento}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${alert.revisado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${alert.revisado ? 'Revisada' : 'Pendiente'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Generar reporte PDF, Excel o CSV
function generateReport() {
    const title = document.getElementById('report-title').value;
    const type = document.getElementById('report-type').value;
    const format = document.getElementById('report-format').value;
    const includeGraphs = document.querySelector('input[name="include-graphs"]').checked;
    const includeAlerts = document.querySelector('input[name="include-alerts"]').checked;
    const includeSummary = document.querySelector('input[name="include-summary"]').checked;
    
    // Crear objeto con datos del formulario
    const reportData = {
        title,
        type,
        format,
        includeGraphs,
        includeAlerts,
        includeSummary,
        dateRange: document.getElementById('date-range').value,
        cameraId: document.getElementById('camera-filter').value,
        startDate: document.getElementById('start-date').value,
        endDate: document.getElementById('end-date').value
    };
    
    // Mostrar indicador de carga
    showLoading();
    
    // Realizar petición al servidor
    fetch('/api/reportes/generar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al generar el reporte');
        }
        return response.json();
    })
    .then(data => {
        // Ocultar el modal
        document.getElementById('report-modal').classList.add('hidden');
        
        // Descargar el archivo si se generó correctamente
        if (data.success && data.fileUrl) {
            window.location.href = data.fileUrl;
            showSuccess(`Reporte "${title}" generado correctamente.`);
        } else {
            showError('No se pudo generar el reporte. Por favor intente nuevamente.');
        }
        
        // Ocultar indicador de carga
        hideLoading();
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Error al generar el reporte. Por favor intente nuevamente.');
        hideLoading();
    });
}

// Cargar notificaciones desde el servidor
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
            }
        })
        .catch(error => {
            console.error('Error al cargar notificaciones:', error);
        });
}

// Actualizar dropdown de notificaciones
function updateNotificationsDropdown(alerts) {
    const dropdown = document.getElementById('notifications-dropdown');
    
    if (!alerts || alerts.length === 0) {
        dropdown.innerHTML = `
            <div class="py-3 px-4 text-sm text-gray-700 text-center">
                No hay notificaciones nuevas
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="bg-gray-100 py-2 px-4 text-xs font-semibold text-gray-600 uppercase">
            Alertas Recientes
        </div>
    `;
    
    alerts.forEach(alert => {
        html += `
            <div class="notification-item border-b border-gray-100 hover:bg-gray-50">
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
        <div class="py-2 px-4 text-center border-t border-gray-100">
            <a href="/reportes" class="text-xs font-medium text-blue-600 hover:text-blue-800">
                Ver todas las alertas
            </a>
        </div>
    `;
    
    dropdown.innerHTML = html;
}

// Marcar alerta como revisada
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
            
            // Recargar datos de reportes si estamos en la página de reportes
            loadReportData();
            
            showSuccess('Alerta marcada como revisada');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Error al marcar la alerta como revisada');
    });
}

// Configurar sistema de notificaciones
function setupNotifications() {
    // Cargar notificaciones al iniciar
    loadNotifications();
    
    // Configurar intervalo para recargar notificaciones cada 30 segundos
    setInterval(loadNotifications, 30000);
}

// Mostrar mensaje de éxito temporal
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

// Mostrar mensaje de error temporal
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
`;
document.head.appendChild(style);