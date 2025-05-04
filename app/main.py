@app.route('/reportes')
def reportes():
    """Renderiza la página de reportes con datos de cámaras y estadísticas"""
    # Verificar que el usuario ha iniciado sesión
    if 'user_email' not in session:
        flash('Por favor inicia sesión para acceder a los reportes', 'error')
        return redirect(url_for('index'))
    
    user_email = session['user_email']
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Consulta para información básica del usuario
        cursor.execute("SELECT * FROM usuarios WHERE correo = %s", (user_email,))
        user_info = cursor.fetchone()
        
        # Consulta para obtener todas las cámaras del usuario
        cursor.execute("""
            SELECT id_camara, nombre_posicion, ip_camara 
            FROM camaras 
            WHERE correo_usuario = %s
            ORDER BY nombre_posicion
        """, (user_email,))
        cameras = cursor.fetchall()
        
        # Obtener estadísticas generales
        camera_ids = [camera['id_camara'] for camera in cameras]
        
        # Si no hay cámaras, establecer valores predeterminados
        if not camera_ids:
            data = {
                'user_info': dict(user_info) if user_info else {},
                'cameras': [],
                'stats': {
                    'total_alerts': 0,
                    'recent_alerts': 0,
                    'reviewed_alerts': 0,
                    'alerts_count': 0
                },
                'recent_alerts': []
            }
        else:
            # Construir placeholders para la consulta SQL
            placeholders = ', '.join(['%s'] * len(camera_ids))
            
            # Total de alertas
            cursor.execute(f"""
                SELECT COUNT(*) FROM eventos_movimiento
                WHERE id_camara IN ({placeholders})
            """, camera_ids)
            total_alerts = cursor.fetchone()[0]
            
            # Alertas recientes (últimas 24 horas)
            cursor.execute(f"""
                SELECT COUNT(*) FROM eventos_movimiento
                WHERE id_camara IN ({placeholders})
                AND fecha_evento >= CURRENT_DATE - INTERVAL '1 day'
            """, camera_ids)
            recent_alerts_count = cursor.fetchone()[0]
            
            # Alertas revisadas
            cursor.execute(f"""
                SELECT COUNT(*) FROM eventos_movimiento
                WHERE id_camara IN ({placeholders})
                AND revisado = TRUE
            """, camera_ids)
            reviewed_alerts = cursor.fetchone()[0]
            
            # Alertas no revisadas (para contador de notificaciones)
            cursor.execute(f"""
                SELECT COUNT(*) FROM eventos_movimiento
                WHERE id_camara IN ({placeholders})
                AND revisado = FALSE
            """, camera_ids)
            alerts_count = cursor.fetchone()[0]
            
            # Obtener las últimas alertas para la tabla
            cursor.execute(f"""
                SELECT em.*, c.nombre_posicion
                FROM eventos_movimiento em
                JOIN camaras c ON em.id_camara = c.id_camara
                WHERE em.id_camara IN ({placeholders})
                ORDER BY em.fecha_evento DESC, em.hora_evento DESC
                LIMIT 10
            """, camera_ids)
            recent_alerts = cursor.fetchall()
            
            # Construir el objeto de datos
            data = {
                'user_info': dict(user_info) if user_info else {},
                'cameras': [dict(camera) for camera in cameras],
                'stats': {
                    'total_alerts': total_alerts,
                    'recent_alerts': recent_alerts_count,
                    'reviewed_alerts': reviewed_alerts,
                    'alerts_count': alerts_count
                },
                'recent_alerts': [dict(alert) for alert in recent_alerts]
            }
        
        cursor.close()
        conn.close()
        
        return render_template('reportes.html', data=data)
        
    except Exception as e:
        app.logger.error(f"Error al cargar reportes: {e}")
        flash('Error al cargar los reportes. Por favor, inténtelo de nuevo.', 'error')
        return redirect(url_for('perfil'))

@app.route('/api/reportes/data')
def reportes_data():
    """API para obtener datos de reportes según filtros"""
    if 'user_email' not in session:
        return jsonify({'error': 'No autorizado'}), 403
    
    user_email = session['user_email']
    
    # Obtener parámetros de la solicitud
    date_range = request.args.get('range', 'week')
    camera_id = request.args.get('camera', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Obtener todas las cámaras del usuario
        cursor.execute("""
            SELECT id_camara FROM camaras 
            WHERE correo_usuario = %s
        """, (user_email,))
        user_cameras = [row['id_camara'] for row in cursor.fetchall()]
        
        if not user_cameras:
            return jsonify({
                'stats': {'total_alerts': 0, 'recent_alerts': 0, 'reviewed_alerts': 0},
                'charts': {
                    'byDay': {'labels': [], 'data': []},
                    'byCamera': {'labels': [], 'data': []},
                    'trend': {'labels': [], 'datasets': [{'label': 'Alertas', 'data': [], 'borderColor': 'rgba(54, 162, 235, 0.8)', 'backgroundColor': 'rgba(54, 162, 235, 0.2)'}]}
                },
                'alerts': []
            })
        
        # Filtrar por cámara específica si se proporciona
        camera_filter = []
        if camera_id != 'all' and int(camera_id) in user_cameras:
            camera_filter = [int(camera_id)]
        else:
            camera_filter = user_cameras
            
        placeholders = ', '.join(['%s'] * len(camera_filter))
        
        # Construir condición de fecha según el rango seleccionado
        date_condition = ""
        params = camera_filter.copy()  # Inicializar con las cámaras, ya que siempre serán los primeros parámetros
        
        if date_range == 'day':
            date_condition = "fecha_evento >= CURRENT_DATE - INTERVAL '1 day'"
        elif date_range == 'week':
            date_condition = "fecha_evento >= CURRENT_DATE - INTERVAL '7 days'"
        elif date_range == 'month':
            date_condition = "fecha_evento >= CURRENT_DATE - INTERVAL '30 days'"
        elif date_range == 'custom' and start_date and end_date:
            date_condition = "fecha_evento BETWEEN %s::date AND %s::date"
            params.extend([start_date, end_date])
        else:
            # Por defecto, usar una semana
            date_condition = "fecha_evento >= CURRENT_DATE - INTERVAL '7 days'"
        
        # Consulta para estadísticas
        # Total de alertas con filtros aplicados
        cursor.execute(f"""
            SELECT COUNT(*) FROM eventos_movimiento
            WHERE id_camara IN ({placeholders})
            AND {date_condition}
        """, params)
        total_alerts = cursor.fetchone()[0]
        
        # Alertas recientes (últimas 24 horas) con filtros de cámara
        cursor.execute(f"""
            SELECT COUNT(*) FROM eventos_movimiento
            WHERE id_camara IN ({placeholders})
            AND fecha_evento >= CURRENT_DATE - INTERVAL '1 day'
        """, camera_filter)
        recent_alerts = cursor.fetchone()[0]
        
        # Alertas revisadas con filtros aplicados
        cursor.execute(f"""
            SELECT COUNT(*) FROM eventos_movimiento
            WHERE id_camara IN ({placeholders})
            AND {date_condition}
            AND revisado = TRUE
        """, params)
        reviewed_alerts = cursor.fetchone()[0]
        
        # Datos para gráfica de barras (alertas por día)
        days_of_week = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        
        cursor.execute(f"""
            SELECT 
                EXTRACT(DOW FROM fecha_evento) as day_number,
                COUNT(*) as count
            FROM eventos_movimiento
            WHERE id_camara IN ({placeholders})
            AND {date_condition}
            GROUP BY day_number
            ORDER BY day_number
        """, params)
        
        by_day_data = cursor.fetchall()
        
        # Inicializar contadores para cada día
        daily_counts = [0] * 7
        
        # PostgreSQL EXTRACT(DOW) devuelve 0 para domingo y 6 para sábado
        # Ajustar para que domingo sea 6 (último día) y lunes sea 0 (primer día)
        for row in by_day_data:
            day_num = int(row['day_number'])
            # Convertir de domingo=0 a domingo=6
            adjusted_day = (day_num - 1) % 7
            daily_counts[adjusted_day] = row['count']
        
        # Datos para gráfica circular (distribución por cámara)
        cursor.execute(f"""
            SELECT 
                c.nombre_posicion,
                COUNT(e.id_evento) as total
            FROM camaras c
            LEFT JOIN eventos_movimiento e ON c.id_camara = e.id_camara
            AND {date_condition}
            WHERE c.id_camara IN ({placeholders})
            GROUP BY c.nombre_posicion
            ORDER BY total DESC
        """, params)
        
        camera_distribution = cursor.fetchall()
        camera_labels = [row['nombre_posicion'] for row in camera_distribution]
        camera_data = [row['total'] for row in camera_distribution]
        
        # Datos para gráfica de tendencia (últimas 4 semanas)
        cursor.execute(f"""
            SELECT 
                EXTRACT(WEEK FROM fecha_evento) as week_number,
                COUNT(*) as count
            FROM eventos_movimiento
            WHERE id_camara IN ({placeholders})
            AND fecha_evento >= CURRENT_DATE - INTERVAL '28 days'
            GROUP BY week_number
            ORDER BY week_number
        """, camera_filter)
        
        trend_data = cursor.fetchall()
        
        # Preparar etiquetas para semanas (últimas 4 semanas)
        current_week = datetime.now().isocalendar()[1]
        week_labels = []
        week_counts = []
        
        for i in range(4):
            week_num = (current_week - 3 + i) % 52
            if week_num <= 0:
                week_num += 52
            week_labels.append(f'Semana {week_num}')
            
            # Buscar si hay datos para esta semana
            count = 0
            for row in trend_data:
                if int(row['week_number']) == week_num:
                    count = row['count']
                    break
            week_counts.append(count)
        
        # Últimas alertas para la tabla
        cursor.execute(f"""
            SELECT em.*, c.nombre_posicion
            FROM eventos_movimiento em
            JOIN camaras c ON em.id_camara = c.id_camara
            WHERE em.id_camara IN ({placeholders})
            AND {date_condition}
            ORDER BY em.fecha_evento DESC, em.hora_evento DESC
            LIMIT 10
        """, params)
        
        alerts = cursor.fetchall()
        
        # Formatear las alertas para JSON
        formatted_alerts = []
        for alert in alerts:
            formatted_alerts.append({
                'nombre_posicion': alert['nombre_posicion'],
                'descripcion': alert['descripcion'],
                'fecha_evento': alert['fecha_evento'].strftime('%Y-%m-%d'),
                'hora_evento': alert['hora_evento'].strftime('%H:%M:%S'),
                'revisado': alert['revisado']
            })
        
        cursor.close()
        conn.close()
        
        # Construir respuesta JSON
        return jsonify({
            'stats': {
                'total_alerts': total_alerts,
                'recent_alerts': recent_alerts,
                'reviewed_alerts': reviewed_alerts
            },
            'charts': {
                'byDay': {
                    'labels': days_of_week,
                    'data': daily_counts
                },
                'byCamera': {
                    'labels': camera_labels,
                    'data': camera_data
                },
                'trend': {
                    'labels': week_labels,
                    'datasets': [{
                        'label': 'Alertas',
                        'data': week_counts,
                        'borderColor': 'rgba(54, 162, 235, 0.8)',
                        'backgroundColor': 'rgba(54, 162, 235, 0.2)'
                    }]
                }
            },
            'alerts': formatted_alerts
        })
        
    except Exception as e:
        app.logger.error(f"Error en reportes_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reportes/duracion')
def reportes_duracion():
    """API para obtener datos de duración de movimiento según filtros"""
    if 'user_email' not in session:
        return jsonify({'error': 'No autorizado'}), 403
    
    user_email = session['user_email']
    
    # Obtener parámetros de la solicitud
    date_range = request.args.get('range', 'week')
    camera_id = request.args.get('camera', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Obtener todas las cámaras del usuario
        cursor.execute("""
            SELECT id_camara FROM camaras 
            WHERE correo_usuario = %s
        """, (user_email,))
        user_cameras = [row['id_camara'] for row in cursor.fetchall()]
        
        if not user_cameras:
            return jsonify({
                'stats': {'bajo': 0, 'moderado': 0, 'alto': 0, 'critico': 0},
                'promedios': [],
                'eventos': []
            })
        
        # Filtrar por cámara específica si se proporciona
        camera_filter = []
        if camera_id != 'all' and int(camera_id) in user_cameras:
            camera_filter = [int(camera_id)]
        else:
            camera_filter = user_cameras
            
        placeholders = ', '.join(['%s'] * len(camera_filter))
        
        # Construir condición de fecha según el rango seleccionado
        date_condition = ""
        params = camera_filter.copy()  # Inicializar con las cámaras, ya que siempre serán los primeros parámetros
        
        if date_range == 'day':
            date_condition = "em.fecha_evento >= CURRENT_DATE - INTERVAL '1 day'"
        elif date_range == 'week':
            date_condition = "em.fecha_evento >= CURRENT_DATE - INTERVAL '7 days'"
        elif date_range == 'month':
            date_condition = "em.fecha_evento >= CURRENT_DATE - INTERVAL '30 days'"
        elif date_range == 'custom' and start_date and end_date:
            date_condition = "em.fecha_evento BETWEEN %s::date AND %s::date"
            params.extend([start_date, end_date])
        else:
            # Por defecto, usar una semana
            date_condition = "em.fecha_evento >= CURRENT_DATE - INTERVAL '7 days'"
        
        # 1. Obtener estadísticas de categorización por duración
        cursor.execute(f"""
            SELECT 
                COUNT(CASE WHEN dm.duracion_segundos < 5 THEN 1 END) as bajo,
                COUNT(CASE WHEN dm.duracion_segundos >= 5 AND dm.duracion_segundos < 20 THEN 1 END) as moderado,
                COUNT(CASE WHEN dm.duracion_segundos >= 20 AND dm.duracion_segundos < 60 THEN 1 END) as alto,
                COUNT(CASE WHEN dm.duracion_segundos >= 60 THEN 1 END) as critico
            FROM duracion_movimiento dm
            JOIN eventos_movimiento em ON dm.id_evento = em.id_evento
            WHERE em.id_camara IN ({placeholders})
            AND {date_condition}
        """, params)
        
        stats = cursor.fetchone()
        
        # 2. Obtener duración promedio por cámara
        cursor.execute(f"""
            SELECT 
                c.nombre_posicion,
                COALESCE(AVG(dm.duracion_segundos), 0) as duracion_promedio
            FROM camaras c
            LEFT JOIN eventos_movimiento em ON c.id_camara = em.id_camara
            LEFT JOIN duracion_movimiento dm ON em.id_evento = dm.id_evento
            WHERE c.id_camara IN ({placeholders})
            AND ({date_condition} OR em.id_evento IS NULL)
            GROUP BY c.nombre_posicion
            ORDER BY duracion_promedio DESC
        """, params)
        
        promedios = cursor.fetchall()
        
        # 3. Obtener eventos de larga duración (> 20 segundos)
        cursor.execute(f"""
            SELECT 
                c.nombre_posicion,
                em.fecha_evento,
                em.hora_evento,
                dm.duracion_segundos,
                em.revisado
            FROM duracion_movimiento dm
            JOIN eventos_movimiento em ON dm.id_evento = em.id_evento
            JOIN camaras c ON em.id_camara = c.id_camara
            WHERE em.id_camara IN ({placeholders})
            AND {date_condition}
            AND dm.duracion_segundos >= 20
            ORDER BY dm.duracion_segundos DESC, em.fecha_evento DESC, em.hora_evento DESC
            LIMIT 10
        """, params)
        
        eventos = cursor.fetchall()
        
        # Formatear los datos para JSON
        formatted_stats = {
            'bajo': stats['bajo'] if stats else 0,
            'moderado': stats['moderado'] if stats else 0,
            'alto': stats['alto'] if stats else 0,
            'critico': stats['critico'] if stats else 0
        }
        
        formatted_promedios = []
        for promedio in promedios:
            formatted_promedios.append({
                'nombre_posicion': promedio['nombre_posicion'],
                'duracion_promedio': round(float(promedio['duracion_promedio']), 1)
            })
        
        formatted_eventos = []
        for evento in eventos:
            formatted_eventos.append({
                'nombre_posicion': evento['nombre_posicion'],
                'fecha_evento': evento['fecha_evento'].strftime('%Y-%m-%d'),
                'hora_evento': evento['hora_evento'].strftime('%H:%M:%S'),
                'duracion_segundos': evento['duracion_segundos'],
                'revisado': evento['revisado']
            })
        
        cursor.close()
        conn.close()
        
        # Construir respuesta JSON
        return jsonify({
            'stats': formatted_stats,
            'promedios': formatted_promedios,
            'eventos': formatted_eventos
        })
        
    except Exception as e:
        app.logger.error(f"Error en reportes_duracion: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reportes/generar', methods=['POST'])
def generar_reporte():
    """API para generar reportes en diferentes formatos (PDF, Excel, CSV) con los nuevos tipos especializados"""
    if 'user_email' not in session:
        return jsonify({'error': 'No autorizado'}), 403
    
    user_email = session['user_email']
    
    # Obtener datos del formulario
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Datos no válidos'}), 400
        
    # Extraer parámetros generales
    title = data.get('title', 'Reporte de alertas')
    report_type = data.get('type', 'complete-integrated')
    format_type = data.get('format', 'pdf')
    date_range = data.get('dateRange', 'week')
    camera_id = data.get('cameraId', 'all')
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    
    # Extraer opciones específicas según el tipo de reporte
    report_options = {}
    
    # Para reporte de cámaras
    if report_type == 'cameras-analysis':
        report_options['cameraAlertsDist'] = data.get('cameraAlertsDist', True)
        report_options['cameraPeakHours'] = data.get('cameraPeakHours', True)
        report_options['cameraEffectiveness'] = data.get('cameraEffectiveness', True)
    
    # Para reporte de sensores y duración
    elif report_type == 'sensors-duration':
        report_options['sensorsClassification'] = data.get('sensorsClassification', True)
        report_options['sensorsAvgDuration'] = data.get('sensorsAvgDuration', True)
        report_options['sensorsAnomalies'] = data.get('sensorsAnomalies', True)
    
    # Para reporte completo integrado
    elif report_type == 'complete-integrated':
        report_options['detailLevel'] = data.get('detailLevel', 'standard')
        report_options['includeRecommendations'] = data.get('includeRecommendations', True)
    
    try:
        # Obtener datos necesarios para el reporte
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Obtener información del usuario
        cursor.execute("""
            SELECT nombre_usuario, nombres, apellidos
            FROM usuarios WHERE correo = %s
        """, (user_email,))
        user_info_row = cursor.fetchone()
        
        if not user_info_row:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # CORRECCIÓN: Asegurar que user_info sea siempre un diccionario
        if isinstance(user_info_row, dict):
            user_info = user_info_row
        else:
            # Si no es un diccionario (puede ser una tupla), convertirlo
            user_info = {
                'nombre_usuario': user_info_row[0],
                'nombres': user_info_row[1],
                'apellidos': user_info_row[2]
            }
            
        # Obtener todas las cámaras del usuario
        cursor.execute("""
            SELECT id_camara, nombre_posicion FROM camaras 
            WHERE correo_usuario = %s
        """, (user_email,))
        camera_rows = cursor.fetchall()
        
        # CORRECCIÓN: Asegurar que cameras sea una lista de diccionarios
        if camera_rows and not isinstance(camera_rows[0], dict):
            cameras = [{'id_camara': row[0], 'nombre_posicion': row[1]} for row in camera_rows]
        else:
            cameras = camera_rows
        
        # Construir condición de cámaras
        camera_filter = []
        if camera_id != 'all':
            try:
                camera_id_int = int(camera_id)
                # CORRECCIÓN: Usar acceso seguro a id_camara
                if any(c.get('id_camara') == camera_id_int for c in cameras):
                    camera_filter = [camera_id_int]
                else:
                    camera_filter = [c.get('id_camara') for c in cameras]
            except (ValueError, TypeError):
                camera_filter = [c.get('id_camara') for c in cameras]
        else:
            camera_filter = [c.get('id_camara') for c in cameras]
            
        if not camera_filter:
            return jsonify({'error': 'No hay cámaras disponibles'}), 404
            
        placeholders = ', '.join(['%s'] * len(camera_filter))
        
        # Construir condición de fecha según el rango seleccionado
        date_condition = ""
        params = []
        
        if date_range == 'day':
            date_condition = "fecha_evento >= CURRENT_DATE - INTERVAL '1 day'"
        elif date_range == 'week':
            date_condition = "fecha_evento >= CURRENT_DATE - INTERVAL '7 days'"
        elif date_range == 'month':
            date_condition = "fecha_evento >= CURRENT_DATE - INTERVAL '30 days'"
        elif date_range == 'custom' and start_date and end_date:
             start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
             end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
             date_condition = "fecha_evento BETWEEN %s AND %s"
             params = [start_date_obj, end_date_obj]
        else:
            # Por defecto, usar una semana
            date_condition = "fecha_evento >= CURRENT_DATE - INTERVAL '7 days'"
        
        # Preparar parámetros completos para consultas
        full_params = camera_filter.copy()
        if params:
            full_params.extend(params)
            
        # Inicializar estructuras de datos para los diferentes tipos de reportes
        report_data = {
            'general_stats': {},
            'cameras_data': {},
            'sensors_data': {},
            'alerts_data': []
        }
        
        # Obtener estadísticas generales (para todos los reportes)
        cursor.execute(f"""
            SELECT COUNT(*) FROM eventos_movimiento
            WHERE id_camara IN ({placeholders})
            AND {date_condition}
        """, full_params)
        
        # CORRECCIÓN: Acceder al primer elemento directamente como número
        count_result = cursor.fetchone()
        report_data['general_stats']['total_alerts'] = count_result[0] if isinstance(count_result, (tuple, list)) else count_result

        # Alertas recientes (24h)
        cursor.execute(f"""
            SELECT COUNT(*) FROM eventos_movimiento
            WHERE id_camara IN ({placeholders})
            AND fecha_evento >= CURRENT_DATE - INTERVAL '1 day'
        """, camera_filter)
        
        # CORRECCIÓN: Acceder al primer elemento directamente como número
        count_result = cursor.fetchone()
        report_data['general_stats']['recent_alerts'] = count_result[0] if isinstance(count_result, (tuple, list)) else count_result
        
        # Alertas revisadas
        cursor.execute(f"""
            SELECT COUNT(*) FROM eventos_movimiento
            WHERE id_camara IN ({placeholders})
            AND {date_condition}
            AND revisado = TRUE
        """, full_params)
        
        # CORRECCIÓN: Acceder al primer elemento directamente como número
        count_result = cursor.fetchone()
        report_data['general_stats']['reviewed_alerts'] = count_result[0] if isinstance(count_result, (tuple, list)) else count_result
        
        # ... [resto del código permanece igual] ...
        
        # Generar el archivo según el formato solicitado
        safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')
        filename = f"reporte_{safe_title}_{user_info['nombre_usuario']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # CORRECCIÓN: Asegurar que el directorio para reportes existe
        reports_dir = os.path.join(app.root_path, 'static', 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        
        file_path = ""
        
        # CORRECCIÓN: Verificar que las funciones de generación existan antes de llamarlas
        if format_type == 'pdf':
            file_path = generate_pdf_report(
                title=title,
                user_info=user_info,
                report_data=report_data,
                report_type=report_type,
                report_options=report_options,
                date_range=date_range,
                start_date=start_date,
                end_date=end_date,
                filename=filename
            )
        elif format_type == 'excel':
            if 'generate_excel_report' in globals():
                file_path = generate_excel_report(
                    title=title,
                    user_info=user_info,
                    report_data=report_data,
                    report_type=report_type,
                    date_range=date_range,
                    filename=filename
                )
            else:
                return jsonify({'error': 'Función de generación Excel no implementada'}), 500
        elif format_type == 'csv':
            if 'generate_csv_report' in globals():
                file_path = generate_csv_report(
                    report_data=report_data,
                    report_type=report_type,
                    filename=filename
                )
            else:
                return jsonify({'error': 'Función de generación CSV no implementada'}), 500
        else:
            return jsonify({'error': 'Formato no soportado'}), 400
        
        # Registrar la generación del reporte en la base de datos
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Obtener la primera cámara de la lista como referencia
            camera_ref = camera_filter[0] if camera_filter else None
            
            cursor.execute("""
                INSERT INTO reportes (id_camara, fecha_reporte, hora_reporte, descripcion)
                VALUES (%s, CURRENT_DATE, CURRENT_TIME, %s)
            """, (camera_ref, f"Reporte {report_type}: {title}"))
            
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            app.logger.error(f"Error al registrar reporte: {str(e)}")
        
        # CORRECCIÓN: Verificar que el archivo existe antes de crear URL
        if not os.path.exists(file_path):
            app.logger.error(f"El archivo {file_path} no fue generado correctamente")
            return jsonify({'error': 'Error al generar el archivo de reporte'}), 500
        
        # Crear URL para descargar el archivo
        # CORRECCIÓN: Asegurarse de que estamos usando la ruta correcta
        filename_only = os.path.basename(file_path)
        file_url = url_for('download_report', filename=filename_only, _external=True)
        
        return jsonify({
            'success': True,
            'fileUrl': file_url,
            'message': f'Reporte {title} generado exitosamente'
        })
        
    except Exception as e:
        app.logger.error(f"Error en generar_reporte: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/reports/download/<filename>')
def download_report(filename):
    # CORRECCIÓN: Asegurarse de usar la misma ruta que al generar el archivo
    reports_dir = os.path.join(app.root_path, 'static', 'reports')
    # CORRECCIÓN: Verificar si el archivo existe
    if not os.path.exists(os.path.join(reports_dir, filename)):
        app.logger.error(f"Archivo no encontrado: {os.path.join(reports_dir, filename)}")
        return "Archivo no encontrado", 404
    
    return send_from_directory(reports_dir, filename, as_attachment=True)
