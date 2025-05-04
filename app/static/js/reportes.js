// Variables para mantener las instancias de las gráficas
let barChart = null;
let pieChart = null;
let lineChart = null;
let duracionChart = null;

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

// Modificación del manejo de tipos de reportes
document.addEventListener('DOMContentLoaded', function() {
    // Configuración de eventos para elementos de la UI
    setupUIInteractions();
    
    // Añadir evento para cambiar opciones según tipo de reporte
    const reportTypeSelect = document.getElementById('report-type');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', function() {
            updateReportOptions(this.value);
        });
        // Inicializar con el valor actual
        updateReportOptions(reportTypeSelect.value);
    }
    
    // Carga los datos iniciales para las gráficas
    loadReportData();
    
    // Inicializar notificaciones
    setupNotifications();
    updateNotificationCounter();
    
    // Añadir manejador para filtro de cámara específico de duración
    const duracionCameraFilter = document.getElementById('duracion-camera-filter');
    if (duracionCameraFilter) {
        // Llenar el filtro con las mismas opciones que el filtro principal
        const mainCameraFilter = document.getElementById('camera-filter');
        if (mainCameraFilter) {
            // Clonar opciones del filtro principal
            Array.from(mainCameraFilter.options).forEach(option => {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.text = option.text;
                duracionCameraFilter.appendChild(newOption);
            });
        }
        // Añadir evento para actualizar cuando cambia el filtro
        duracionCameraFilter.addEventListener('change', cargarDatosDuracion);
    }
    
    // Añadir evento para el botón de actualizar
    const refreshDuracionBtn = document.getElementById('refresh-duracion');
    if (refreshDuracionBtn) {
        refreshDuracionBtn.addEventListener('click', cargarDatosDuracion);
    }
    
    // Integrar con el botón de aplicar filtros general
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        const originalClickHandler = applyFiltersBtn.onclick;
        applyFiltersBtn.onclick = function(e) {
            if (originalClickHandler) {
                originalClickHandler.call(this, e);
            }
            cargarDatosDuracion();
        };
    }
    // Inicializar datos de duración
    cargarDatosDuracion();
});

// Configurar interacciones de la UI (modificada)
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
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateContainer.classList.remove('hidden');
            } else {
                customDateContainer.classList.add('hidden');
            }
        });
    }
    
    // Aplicar filtros y recargar datos
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            loadReportData();
        });
    }
    
    // Mostrar modal de generación de reportes
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', function() {
            document.getElementById('report-modal').classList.remove('hidden');
        });
    }
    
    // Cerrar modal de reportes
    if (closeReportModalBtn) {
        closeReportModalBtn.addEventListener('click', function() {
            document.getElementById('report-modal').classList.add('hidden');
        });
    }
    
    // Cancelar generación de reporte
    if (cancelReportBtn) {
        cancelReportBtn.addEventListener('click', function() {
            document.getElementById('report-modal').classList.add('hidden');
        });
    }
    
    // Enviar formulario de generación de reporte
    if (reportForm) {
        reportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            generateReport();
        });
    }
    
    // Mostrar/ocultar dropdown de usuario
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function() {
            userDropdown.classList.toggle('hidden');
        });
    }
    
    // Mostrar/ocultar dropdown de notificaciones
    if (notificationsBtn && notificationsDropdown) {
        notificationsBtn.addEventListener('click', function() {
            loadNotifications();
            notificationsDropdown.classList.toggle('hidden');
        });
    }
    
    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (userMenuBtn && userDropdown && !userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }
        
        if (notificationsBtn && notificationsDropdown && !notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
            notificationsDropdown.classList.add('hidden');
        }
    });
    
    // Establecer fechas por defecto (última semana) si existen los campos
    const startDateField = document.getElementById('start-date');
    const endDateField = document.getElementById('end-date');
    
    if (startDateField && endDateField) {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        
        startDateField.value = formatDate(lastWeek);
        endDateField.value = formatDate(today);
    }
}

// Función para actualizar opciones según tipo de reporte
function updateReportOptions(reportType) {
    // Ocultar todas las opciones específicas
    document.querySelectorAll('.report-specific-options').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Mostrar opciones específicas según el tipo seleccionado
    switch(reportType) {
        case 'cameras-analysis':
            document.getElementById('cameras-options').classList.remove('hidden');
            break;
        case 'sensors-duration':
            document.getElementById('sensors-options').classList.remove('hidden');
            break;
        case 'complete-integrated':
            document.getElementById('complete-options').classList.remove('hidden');
            break;
    }
}

// Generar reporte PDF, Excel o CSV (modificada)
function generateReport() {
    const title = document.getElementById('report-title').value;
    const type = document.getElementById('report-type').value;
    const format = document.getElementById('report-format').value;
    const dateRangeReport = document.getElementById('date-range-report').value;
    
    // Crear objeto con datos del formulario
    const reportData = {
        title,
        type,
        format,
        dateRange: dateRangeReport
    };
    
    // Añadir opciones específicas según el tipo de reporte
    switch(type) {
        case 'cameras-analysis':
            reportData.cameraAlertsDist = document.querySelector('input[name="camera-alerts-dist"]').checked;
            reportData.cameraPeakHours = document.querySelector('input[name="camera-peak-hours"]').checked;
            reportData.cameraEffectiveness = document.querySelector('input[name="camera-effectiveness"]').checked;
            break;
        
        case 'sensors-duration':
            reportData.sensorsClassification = document.querySelector('input[name="sensors-classification"]').checked;
            reportData.sensorsAvgDuration = document.querySelector('input[name="sensors-avg-duration"]').checked;
            reportData.sensorsAnomalies = document.querySelector('input[name="sensors-anomalies"]').checked;
            break;
        
        case 'complete-integrated':
            reportData.detailLevel = document.getElementById('detail-level').value;
            reportData.includeRecommendations = document.querySelector('input[name="include-recommendations"]').checked;
            break;
    }
    
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
        
        // Simulación de éxito en ambiente de desarrollo
        setTimeout(() => {
            document.getElementById('report-modal').classList.add('hidden');
            showSuccess(`Reporte "${title}" generado correctamente en modo de simulación.`);
            hideLoading();
        }, 1500);
    });
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


// Función para clasificar el movimiento según su duración
function clasificarMovimiento(duracionSegundos) {
    if (duracionSegundos < 5) {
        return {
            nivel: 'bajo',
            mensaje: 'Actividad breve - posible falso positivo',
            color: chartColors.green
        };
    } else if (duracionSegundos < 20) {
        return {
            nivel: 'moderado',
            mensaje: 'Actividad normal - posible tránsito regular',
            color: chartColors.blue
        };
    } else if (duracionSegundos < 60) {
        return {
            nivel: 'alto',
            mensaje: 'Actividad prolongada - requiere revisión',
            color: chartColors.yellow
        };
    } else {
        return {
            nivel: 'crítico',
            mensaje: 'Actividad sospechosa - revise urgentemente',
            color: chartColors.red
        };
    }
}

// Función para formatear la duración en formato legible
function formatearDuracion(segundos) {
    if (segundos < 60) {
        return `${segundos} segundos`;
    } else {
        const minutos = Math.floor(segundos / 60);
        const segsRestantes = segundos % 60;
        return `${minutos} min ${segsRestantes} seg`;
    }
}

// Función para cargar los datos de duración de actividad
function cargarDatosDuracion() {
    const dateRange = document.getElementById('date-range').value;
    const cameraId = document.getElementById('duracion-camera-filter').value || 'all';
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
    fetch(`/api/reportes/duracion?${params.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar datos de duración');
            }
            return response.json();
        })
        .then(data => {
            // Actualizar contadores de clasificación
            actualizarContadoresDuracion(data.stats);
            
            // Actualizar gráfica de duración promedio
            actualizarGraficaDuracion(data.promedios);
            
            // Actualizar tabla de eventos de larga duración
            actualizarTablaDuracion(data.eventos);
            
            // Ocultar indicador de carga
            hideLoading();
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Error al cargar los datos de duración. Por favor intente nuevamente.');
            hideLoading();
            
            // Cargar datos de ejemplo en caso de error
            cargarDatosDuracionEjemplo();
        });
}

// Función para actualizar contadores de duración
function actualizarContadoresDuracion(stats) {
    document.getElementById('duracion-bajo').textContent = stats.bajo || 0;
    document.getElementById('duracion-moderado').textContent = stats.moderado || 0;
    document.getElementById('duracion-alto').textContent = stats.alto || 0;
    document.getElementById('duracion-critico').textContent = stats.critico || 0;
}

// Función para actualizar la gráfica de duración promedio
function actualizarGraficaDuracion(datos) {
    const ctx = document.getElementById('duracionPromedio').getContext('2d');
    
    // Preparar datos para la gráfica
    const labels = datos.map(item => item.nombre_posicion);
    const duraciones = datos.map(item => item.duracion_promedio);
    
    // Crear array de colores basados en la clasificación
    const backgroundColors = duraciones.map(duracion => {
        return clasificarMovimiento(duracion).color;
    });
    
    // Si ya existe la gráfica, actualizarla
    if (duracionChart) {
        duracionChart.data.labels = labels;
        duracionChart.data.datasets[0].data = duraciones;
        duracionChart.data.datasets[0].backgroundColor = backgroundColors;
        duracionChart.update();
    } else {
        // Crear nueva gráfica
        duracionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Duración promedio (segundos)',
                    data: duraciones,
                    backgroundColor: backgroundColors,
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
                        title: {
                            display: true,
                            text: 'Segundos'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const duracion = context.raw;
                                const clasificacion = clasificarMovimiento(duracion);
                                return clasificacion.mensaje;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Función para actualizar la tabla de eventos de larga duración
function actualizarTablaDuracion(eventos) {
    const tableBody = document.getElementById('duracion-table-body');
    
    // Limpiar tabla
    tableBody.innerHTML = '';
    
    if (!eventos || eventos.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center text-gray-500">No hay eventos prolongados en el período seleccionado</td></tr>';
        return;
    }
    
    // Añadir filas para cada evento
    eventos.forEach(evento => {
        const clasificacion = clasificarMovimiento(evento.duracion_segundos);
        const fechaHora = `${evento.fecha_evento} ${evento.hora_evento}`;
        const duracionFormateada = formatearDuracion(evento.duracion_segundos);
        
        const colorClase = {
            'bajo': 'bg-green-100 text-green-800',
            'moderado': 'bg-blue-100 text-blue-800',
            'alto': 'bg-yellow-100 text-yellow-800',
            'crítico': 'bg-red-100 text-red-800'
        }[clasificacion.nivel];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-2">${evento.nombre_posicion}</td>
            <td class="px-4 py-2">${fechaHora}</td>
            <td class="px-4 py-2">${duracionFormateada}</td>
            <td class="px-4 py-2">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClase}">
                    ${clasificacion.nivel.charAt(0).toUpperCase() + clasificacion.nivel.slice(1)}
                </span>
            </td>
            <td class="px-4 py-2">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${evento.revisado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${evento.revisado ? 'Revisado' : 'Pendiente'}
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Función para cargar datos de ejemplo en caso de error
function cargarDatosDuracionEjemplo() {
    const statsEjemplo = {
        bajo: 15,
        moderado: 8,
        alto: 4,
        critico: 1
    };
    
    const promediosEjemplo = [
        { nombre_posicion: 'Entrada principal', duracion_promedio: 3.5 },
        { nombre_posicion: 'Estacionamiento', duracion_promedio: 12.8 },
        { nombre_posicion: 'Centro de datos', duracion_promedio: 25.2 }
    ];
    
    const eventosEjemplo = [
        {
            nombre_posicion: 'Centro de datos',
            fecha_evento: '2025-05-01',
            hora_evento: '14:23:45',
            duracion_segundos: 25,
            revisado: false
        },
        {
            nombre_posicion: 'Centro de datos',
            fecha_evento: '2025-05-02',
            hora_evento: '09:15:32',
            duracion_segundos: 42,
            revisado: true
        },
        {
            nombre_posicion: 'Estacionamiento',
            fecha_evento: '2025-05-03',
            hora_evento: '01:45:12',
            duracion_segundos: 78,
            revisado: false
        }
    ];
    
    actualizarContadoresDuracion(statsEjemplo);
    actualizarGraficaDuracion(promediosEjemplo);
    actualizarTablaDuracion(eventosEjemplo);
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

// Mostrar mensaje de éxito temporal con el nuevo estilo
function showSuccess(message) {
    const flashContainer = document.getElementById('flash-messages');
    const alert = document.createElement('div');
    
    alert.className = 'flash-message flash-message-success';
    alert.innerHTML = `
        <div class="flash-content">
            <div class="flash-icon"></div>
            <div class="flash-text">${message}</div>
            <button type="button" class="close-flash" onclick="this.parentElement.parentElement.remove();">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    flashContainer.appendChild(alert);
    
    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Mostrar mensaje de error temporal con el nuevo estilo
function showError(message) {
    const flashContainer = document.getElementById('flash-messages');
    const alert = document.createElement('div');
    
    alert.className = 'flash-message flash-message-error';
    alert.innerHTML = `
        <div class="flash-content">
            <div class="flash-icon"></div>
            <div class="flash-text">${message}</div>
            <button type="button" class="close-flash" onclick="this.parentElement.parentElement.remove();">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    flashContainer.appendChild(alert);
    
    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Función para mostrar advertencias
function showWarning(message) {
    const flashContainer = document.getElementById('flash-messages');
    const alert = document.createElement('div');
    
    alert.className = 'flash-message flash-message-warning';
    alert.innerHTML = `
        <div class="flash-content">
            <div class="flash-icon"></div>
            <div class="flash-text">${message}</div>
            <button type="button" class="close-flash" onclick="this.parentElement.parentElement.remove();">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    flashContainer.appendChild(alert);
    
    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Función para mostrar información
function showInfo(message) {
    const flashContainer = document.getElementById('flash-messages');
    const alert = document.createElement('div');
    
    alert.className = 'flash-message flash-message-info';
    alert.innerHTML = `
        <div class="flash-content">
            <div class="flash-icon"></div>
            <div class="flash-text">${message}</div>
            <button type="button" class="close-flash" onclick="this.parentElement.parentElement.remove();">
                <i class="fas fa-times"></i>
            </button>
        </div>
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