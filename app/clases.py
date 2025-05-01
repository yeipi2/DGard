import re
import os
import json
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_from_directory
from datetime import date, datetime

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORTS_DIR = os.path.join(BASE_DIR, 'static', 'reports')


def get_db_connection():
    
    conn = psycopg2.connect(
        host="localhost",
        database="DGard",
        user="postgres",
        password=""
    )
    return conn

def validar_email(email):
    """Validar formato de correo electrónico"""
    patron = r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$'
    return re.match(patron, email) is not None

def validar_solo_letras(texto):
    """Validar que el texto solo contenga letras y espacios"""
    patron = r'^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$'
    return re.match(patron, texto) is not None

def validar_telefono(telefono):
    """Validar que el teléfono tenga 10 dígitos numéricos (formato mexicano)"""
    patron = r'^[0-9]{10}$'
    return re.match(patron, telefono) is not None

def validar_contrasena(contrasena):
    """Validar que la contraseña tenga al menos 8 caracteres y un número"""
    if len(contrasena) < 8:
        return False
    return any(char.isdigit() for char in contrasena)

def existe_correo(correo):
    """Verificar si el correo ya existe en la base de datos"""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM usuarios WHERE correo = %s', (correo,))
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return count > 0


def get_unique_filename(base_path, file_extension):
    """Genera un nombre de archivo único si ya existe uno con el mismo nombre"""
    counter = 1
    file_path = f"{base_path}.{file_extension}"
    
    while os.path.exists(file_path):
        file_path = f"{base_path}_{counter}.{file_extension}"
        counter += 1
        
    return file_path



def generate_pdf_report(title, user_info, stats, charts_data, alerts_data, report_type, date_range, start_date, end_date, filename):
    import os
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import numpy as np
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    import io
    
    # Crear directorio para reportes si no existe
    if not os.path.exists(REPORTS_DIR):
        os.makedirs(REPORTS_DIR)
    
    base_path = os.path.join(REPORTS_DIR, filename)
    file_path = get_unique_filename(base_path, 'pdf')
    
    # Determinar la orientación según el tipo de reporte
    pagesize = letter
    if report_type == "camera-activity":
        pagesize = landscape(letter)
    
    # Crear el documento
    doc = SimpleDocTemplate(file_path, pagesize=pagesize, leftMargin=0.5*inch, rightMargin=0.5*inch)
    styles = getSampleStyleSheet()
    elements = []
    
    # Estilos personalizados más atractivos
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=12,
        textColor=colors.HexColor('#003366'),
        leading=22
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=10,
        spaceAfter=10,
        textColor=colors.HexColor('#0066CC'),
        leading=18
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        leading=14
    )
    
    # Agregar logo o encabezado
    # (En una implementación real, podrías incluir un logo corporativo aquí)
    
    # Título y subtítulo según el tipo de reporte
    if report_type == "alerts-summary":
        main_title = f"{title} - RESUMEN DE ALERTAS"
    elif report_type == "camera-activity":
        main_title = f"{title} - ACTIVIDAD POR CÁMARA"
    else:
        main_title = f"{title} - REPORTE COMPLETO"
    
    elements.append(Paragraph(main_title, title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Fecha y hora de generación con mejor formato
    from datetime import datetime
    current_time = datetime.now().strftime('%d/%m/%Y - %H:%M:%S')
    elements.append(Paragraph(f"Generado el: {current_time}", normal_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Información del usuario en formato tabular más atractivo
    elements.append(Paragraph("Información del Usuario", subtitle_style))
    user_data = [
        ["Nombre:", f"{user_info['nombres']} {user_info['apellidos']}"],
        ["Usuario:", user_info['nombre_usuario']]
    ]
    user_table = Table(user_data, colWidths=[2*inch, 4*inch])
    user_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#E0E9F5')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#003366')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#B3C1D1')),
        ('ROUNDEDCORNERS', [5, 5, 5, 5])
    ]))
    elements.append(user_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Período del reporte con mejor formato
    period_text = "Período analizado: "
    if date_range == 'day':
        period_text += "Último día"
    elif date_range == 'week':
        period_text += "Última semana"
    elif date_range == 'month':
        period_text += "Último mes"
    elif date_range == 'custom' and start_date and end_date:
        period_text += f"Del {start_date} al {end_date}"
    
    elements.append(Paragraph(period_text, normal_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # SECCIÓN ESPECÍFICA SEGÚN TIPO DE REPORTE
    
    # Reporte tipo Resumen de Alertas
    if report_type == "alerts-summary":
        # Para resumen de alertas, enfocamos en estadísticas y lista detallada
        if stats:
            elements.append(Paragraph("Resumen de Actividad", subtitle_style))
            
            # Mejorar visualización de estadísticas con iconos o símbolos
            stats_text = f"""
            <para>Durante el período analizado se han registrado <b>{stats['total_alerts']}</b> alertas de movimiento.
            De estas, <b>{stats['recent_alerts']}</b> ocurrieron en las últimas 24 horas, 
            y se han revisado <b>{stats['reviewed_alerts']}</b> alertas ({int((stats['reviewed_alerts']/stats['total_alerts'])*100) if stats['total_alerts'] > 0 else 0}%).</para>
            """
            elements.append(Paragraph(stats_text, normal_style))
            elements.append(Spacer(1, 0.2*inch))
        
        # Gráfico destacado para alertas recientes vs. revisadas
        if stats and stats['total_alerts'] > 0:
            plt.figure(figsize=(6, 3))
            categories = ['Total', 'Recientes (24h)', 'Revisadas']
            values = [stats['total_alerts'], stats['recent_alerts'], stats['reviewed_alerts']]
            colors = ['#0066CC', '#FF9900', '#66CC66']
            
            plt.bar(categories, values, color=colors)
            plt.title('Resumen de Alertas')
            plt.tight_layout()
            
            # Añadir valores sobre las barras
            for i, v in enumerate(values):
                plt.text(i, v + 1, str(v), ha='center')
            
            # Guardar la gráfica
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=150)
            img_buffer.seek(0)
            
            # Crear imagen para el PDF
            img = Image(img_buffer)
            img.drawHeight = 2.5*inch
            img.drawWidth = 6*inch
            elements.append(img)
            plt.close('all')
            
            elements.append(Spacer(1, 0.3*inch))
        
        # Lista detallada de alertas
        if alerts_data:
            elements.append(Paragraph("Detalle de Alertas Registradas", subtitle_style))
            
            # Cabeceras de la tabla con diseño mejorado
            alerts_table_data = [["Cámara", "Descripción", "Fecha", "Hora", "Estado"]]
            
            # Límite de 30 alertas para el reporte de resumen
            alert_limit = min(30, len(alerts_data))
            
            # Datos de alertas
            for alert in alerts_data[:alert_limit]:
                alerts_table_data.append([
                    alert['nombre_posicion'],
                    alert['descripcion'],
                    alert['fecha_evento'],
                    alert['hora_evento'],
                    "✓ Revisada" if alert['revisado'] else "⚠ Pendiente"
                ])
            
            # Crear tabla con mejor diseño
            col_widths = [1.5*inch, 2.5*inch, 1*inch, 0.8*inch, 1.2*inch]
            alerts_table = Table(alerts_table_data, colWidths=col_widths, repeatRows=1)
            
            # Estilo de la tabla mejorado
            table_style = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#003366')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#B3C1D1'))
            ]
            
            # Colorear filas con un esquema más atractivo
            for i in range(1, len(alerts_table_data)):
                if i % 2 == 0:
                    table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F0F5FA')))
                
                # Destacar alertas pendientes
                if not alerts_data[i-1]['revisado']:
                    table_style.append(('TEXTCOLOR', (-1, i), (-1, i), colors.HexColor('#CC3300')))
                else:
                    table_style.append(('TEXTCOLOR', (-1, i), (-1, i), colors.HexColor('#006633')))
            
            # Aplicar estilos a la tabla
            alerts_table.setStyle(TableStyle(table_style))
            elements.append(alerts_table)
            
            # Agregar nota si hay más alertas
            if len(alerts_data) > alert_limit:
                elements.append(Spacer(1, 0.2*inch))
                nota = f"Nota: Se muestran {alert_limit} de {len(alerts_data)} alertas. Para ver el listado completo, genere un reporte completo."
                elements.append(Paragraph(nota, ParagraphStyle('Nota', parent=styles['Italic'], textColor=colors.grey)))
    
    # Reporte tipo Actividad por Cámara
    elif report_type == "camera-activity":
        # Para actividad por cámara, enfocamos en distribución y tendencias
        elements.append(Paragraph("Análisis de Actividad por Cámara", subtitle_style))
        
        # Distribución por cámara como gráfico principal
        if charts_data and 'by_camera' in charts_data and len(charts_data['by_camera']['labels']) > 0:
            # Gráfico de pastel mejorado visualmente
            plt.figure(figsize=(7, 5))
            
            # Usar colores más atractivos
            color_palette = plt.cm.viridis(np.linspace(0, 1, len(charts_data['by_camera']['labels'])))
            
            # Si hay muchas cámaras, limitamos para mejor visualización
            max_cameras = 8
            if len(charts_data['by_camera']['labels']) > max_cameras:
                # Tomar las cámaras con más alertas
                top_cameras = sorted(zip(charts_data['by_camera']['labels'], 
                                        charts_data['by_camera']['data']),
                                    key=lambda x: x[1], reverse=True)
                
                # Separar top cámaras y agrupar el resto
                top_labels = [x[0] for x in top_cameras[:max_cameras-1]]
                top_data = [x[1] for x in top_cameras[:max_cameras-1]]
                
                # Crear categoría "Otras"
                other_data = sum([x[1] for x in top_cameras[max_cameras-1:]])
                
                # Juntar datos
                labels = top_labels + ["Otras"]
                data = top_data + [other_data]
                
                wedges, texts, autotexts = plt.pie(data, 
                                                  labels=None,
                                                  autopct='%1.1f%%',
                                                  startangle=90,
                                                  colors=color_palette[:max_cameras])
            else:
                wedges, texts, autotexts = plt.pie(charts_data['by_camera']['data'], 
                                                 labels=None,
                                                 autopct='%1.1f%%',
                                                 startangle=90,
                                                 colors=color_palette)
                labels = charts_data['by_camera']['labels']
                data = charts_data['by_camera']['data']
            
            # Personalizar look & feel
            plt.title('Distribución de Alertas por Cámara', fontsize=14, pad=20)
            plt.axis('equal')
            
            # Leyenda en una posición mejor
            plt.legend(wedges, labels, title="Cámaras", 
                      loc="center left", 
                      bbox_to_anchor=(1, 0.5),
                      fontsize=9)
            
            # Personalizar porcentajes
            for autotext in autotexts:
                autotext.set_fontsize(9)
                autotext.set_weight('bold')
            
            plt.tight_layout()
            
            # Guardar la gráfica
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=150)
            img_buffer.seek(0)
            
            # Crear imagen para el PDF
            img = Image(img_buffer)
            img.drawHeight = 4*inch
            img.drawWidth = 7*inch
            elements.append(img)
            plt.close('all')
            
            elements.append(Spacer(1, 0.3*inch))
        
        # Tabla de resumen por cámara
        if charts_data and 'by_camera' in charts_data and len(charts_data['by_camera']['labels']) > 0:
            camera_data = []
            
            # Cabecera
            camera_data.append(["Posición de Cámara", "Total Alertas", "% del Total"])
            
            # Calcular total
            total = sum(charts_data['by_camera']['data'])
            
            # Datos
            for i, cam in enumerate(charts_data['by_camera']['labels']):
                count = charts_data['by_camera']['data'][i]
                percentage = (count/total*100) if total > 0 else 0
                camera_data.append([
                    cam,
                    str(count),
                    f"{percentage:.1f}%"
                ])
            
            # Crear tabla
            camera_table = Table(camera_data, colWidths=[3*inch, 1.5*inch, 1.5*inch], repeatRows=1)
            
            # Estilo
            cam_style = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#003366')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#B3C1D1'))
            ]
            
            # Colorear filas alternadas
            for i in range(1, len(camera_data)):
                if i % 2 == 0:
                    cam_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F0F5FA')))
            
            camera_table.setStyle(TableStyle(cam_style))
            elements.append(camera_table)
        
        # Incluir tendencia semanal si hay datos
        if charts_data and 'trend' in charts_data and len(charts_data['trend']['labels']) > 0:
            elements.append(Spacer(1, 0.4*inch))
            elements.append(Paragraph("Tendencia de Alertas - Últimas Semanas", subtitle_style))
            
            # Gráfico de línea con tendencia
            plt.figure(figsize=(7, 3))
            labels = charts_data['trend']['labels']
            data = charts_data['trend']['datasets'][0]['data']
            
            plt.plot(labels, data, marker='o', color='#0066CC', linewidth=2, markersize=8)
            
            # Añadir área bajo la curva
            plt.fill_between(labels, data, alpha=0.2, color='#0066CC')
            
            # Personalizar gráfico
            plt.title('Evolución de Alertas por Semana')
            plt.grid(True, linestyle='--', alpha=0.7)
            
            # Añadir valores sobre los puntos
            for i, v in enumerate(data):
                plt.text(i, v + max(data)*0.05, str(v), ha='center')
            
            plt.tight_layout()
            
            # Guardar la gráfica
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=150)
            img_buffer.seek(0)
            
            # Crear imagen para el PDF
            img = Image(img_buffer)
            img.drawHeight = 3*inch
            img.drawWidth = 7*inch
            elements.append(img)
            plt.close('all')
    
    # Reporte Completo
    else:  # report_type == "complete"
        # Incluimos información completa, pero con mejor organización
        
        # 1. Resumen estadístico
        if stats:
            elements.append(Paragraph("Resumen Estadístico", subtitle_style))
            
            # Visualización moderna de estadísticas
            stats_data = [
                ["Métrica", "Valor", "Representación"],
                ["Total Alertas", str(stats['total_alerts']), "■" * min(20, int(stats['total_alerts']/5 + 1))],
                ["Alertas Recientes (24h)", str(stats['recent_alerts']), "■" * min(20, int(stats['recent_alerts']/2 + 1))],
                ["Alertas Revisadas", str(stats['reviewed_alerts']), "■" * min(20, int(stats['reviewed_alerts']/5 + 1))]
            ]
            
            stats_table = Table(stats_data, colWidths=[2.5*inch, 1.2*inch, 3.3*inch])
            stats_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#003366')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('ALIGN', (2, 0), (2, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#E0E9F5')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#B3C1D1'))
            ]))
            elements.append(stats_table)
            elements.append(Spacer(1, 0.3*inch))
        
        # 2. Análisis gráfico en dos columnas
        if charts_data:
            elements.append(Paragraph("Análisis Gráfico", subtitle_style))
            
            # Crear distribución por día y cámara en la misma página
            if 'by_day' in charts_data:
                # Gráfico de barras - Alertas por día
                plt.figure(figsize=(5, 3))
                bars = plt.bar(charts_data['by_day']['labels'], charts_data['by_day']['data'], 
                           color='#0066CC')
                
                # Añadir etiquetas sobre las barras
                for bar in bars:
                    height = bar.get_height()
                    plt.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                            '%d' % int(height), ha='center', va='bottom')
                
                plt.title('Alertas por Día de la Semana')
                plt.xlabel('Día')
                plt.ylabel('Número de Alertas')
                plt.grid(axis='y', alpha=0.3)
                plt.tight_layout()
                
                # Guardar la gráfica
                img_buffer_day = io.BytesIO()
                plt.savefig(img_buffer_day, format='png', dpi=150)
                img_buffer_day.seek(0)
                plt.close('all')
                
                day_img = Image(img_buffer_day)
                day_img.drawHeight = 2.8*inch
                day_img.drawWidth = 4*inch
            
            if 'by_camera' in charts_data and len(charts_data['by_camera']['labels']) > 0:
                # Gráfico circular - Distribución por cámara
                plt.figure(figsize=(5, 3))
                # Máximo 6 cámaras para visualización
                max_cams = 6
                
                if len(charts_data['by_camera']['labels']) > max_cams:
                    # Ordenar por valor
                    sorted_data = sorted(zip(charts_data['by_camera']['labels'], 
                                           charts_data['by_camera']['data']),
                                       key=lambda x: x[1], reverse=True)
                    
                    # Separar top cámaras y agrupar el resto
                    top_labels = [x[0] for x in sorted_data[:max_cams-1]]
                    top_data = [x[1] for x in sorted_data[:max_cams-1]]
                    
                    # Crear categoría "Otras"
                    other_data = sum([x[1] for x in sorted_data[max_cams-1:]])
                    
                    # Juntar datos
                    labels = top_labels + ["Otras"]
                    data = top_data + [other_data]
                else:
                    labels = charts_data['by_camera']['labels']
                    data = charts_data['by_camera']['data']
                
                # Si no hay datos, mostrar mensaje
                if sum(data) == 0:
                    plt.text(0.5, 0.5, "No hay datos disponibles", 
                            ha='center', va='center', fontsize=12)
                else:
                    plt.pie(data, autopct='%1.1f%%', shadow=True)
                    plt.title('Distribución por Cámara')
                    plt.legend(labels, loc='upper right', fontsize='small')
                
                plt.tight_layout()
                
                # Guardar la gráfica
                img_buffer_cam = io.BytesIO()
                plt.savefig(img_buffer_cam, format='png', dpi=150)
                img_buffer_cam.seek(0)
                plt.close('all')
                
                cam_img = Image(img_buffer_cam)
                cam_img.drawHeight = 2.8*inch
                cam_img.drawWidth = 4*inch
            
            # Crear tabla para organizar los gráficos en dos columnas
            if 'by_day' in charts_data and 'by_camera' in charts_data:
                graphics_table_data = [[day_img, cam_img]]
                graphics_table = Table(graphics_table_data)
                elements.append(graphics_table)
            elif 'by_day' in charts_data:
                elements.append(day_img)
            elif 'by_camera' in charts_data:
                elements.append(cam_img)
            
            elements.append(Spacer(1, 0.3*inch))
        
        # 3. Lista detallada de alertas
        if alerts_data:
            elements.append(PageBreak())  # Nueva página para la lista de alertas
            elements.append(Paragraph("Alertas Registradas", subtitle_style))
            
            # Cabeceras de la tabla
            alerts_table_data = [["Cámara", "Descripción", "Fecha", "Hora", "Estado"]]
            
            # Datos de alertas - En el reporte completo incluimos todas
            for alert in alerts_data:
                alerts_table_data.append([
                    alert['nombre_posicion'],
                    alert['descripcion'],
                    alert['fecha_evento'],
                    alert['hora_evento'],
                    "✓ Revisada" if alert['revisado'] else "⚠ Pendiente"
                ])
            
            # Crear tabla
            col_widths = [1.5*inch, 2.5*inch, 1*inch, 0.8*inch, 1.2*inch]
            alerts_table = Table(alerts_table_data, colWidths=col_widths, repeatRows=1)
            
            # Estilo de la tabla
            table_style = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#003366')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#B3C1D1'))
            ]
            
            # Colorear filas con un esquema más atractivo
            for i in range(1, len(alerts_table_data)):
                if i % 2 == 0:
                    table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F0F5FA')))
                
                # Destacar alertas pendientes
                if not alerts_data[i-1]['revisado']:
                    table_style.append(('TEXTCOLOR', (-1, i), (-1, i), colors.HexColor('#CC3300')))
                else:
                    table_style.append(('TEXTCOLOR', (-1, i), (-1, i), colors.HexColor('#006633')))
            
            # Aplicar estilos a la tabla
            alerts_table.setStyle(TableStyle(table_style))
            elements.append(alerts_table)
    
    # Agregar pie de página con información adicional
    elements.append(Spacer(1, 0.5*inch))
    footer_text = f"Sistema de Monitoreo de Seguridad | Reporte generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M:%S')}"
    elements.append(Paragraph(footer_text, ParagraphStyle('footer', parent=styles['Italic'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)))
    
    # Construir el PDF
    doc.build(elements)
    
    return file_path


def generate_excel_report(title, user_info, stats, alerts_data, filename, charts_data=None, report_type="complete", date_range="week", start_date=None, end_date=None):
    """
    Genera un reporte Excel más estético con diferentes secciones según el tipo de reporte
    
    Parameters:
    - title: Título del reporte
    - user_info: Información del usuario
    - stats: Estadísticas resumidas
    - charts_data: Datos para gráficos
    - alerts_data: Datos de alertas
    - report_type: Tipo de reporte (alerts-summary, camera-activity, complete)
    - date_range: Rango de fechas del reporte
    - start_date: Fecha de inicio (si es personalizado)
    - end_date: Fecha de fin (si es personalizado)
    - filename: Nombre base del archivo
    
    Returns:
    - file_path: Ruta del archivo generado
    """
    import pandas as pd
    import os
    import numpy as np
    import matplotlib.pyplot as plt
    import io
    from datetime import datetime
    

    if not os.path.exists(REPORTS_DIR):
        os.makedirs(REPORTS_DIR)
    
    base_path = os.path.join(REPORTS_DIR, filename)
    file_path = get_unique_filename(base_path, 'xlsx')
    
    # Crear un escritor de Excel
    with pd.ExcelWriter(file_path, engine='xlsxwriter') as writer:
        workbook = writer.book
        
        # Formatos comunes
        title_format = workbook.add_format({
            'bold': True, 
            'font_size': 16, 
            'align': 'center', 
            'valign': 'vcenter',
            'font_color': '#003366'
        })
        
        header_format = workbook.add_format({
            'bold': True, 
            'bg_color': '#003366', 
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        subheader_format = workbook.add_format({
            'bold': True, 
            'bg_color': '#4472C4', 
            'font_color': 'white',
            'border': 1,
            'align': 'center'
        })
        
        cell_format = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        date_format = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'num_format': 'dd/mm/yyyy'
        })
        
        time_format = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'num_format': 'hh:mm:ss'
        })
        
        cell_alert_pending = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'bg_color': '#FFEB9C',  # Amarillo claro
            'font_color': '#9C6500'  # Naranja oscuro
        })
        
        cell_alert_reviewed = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'bg_color': '#E2EFDA',  # Verde claro
            'font_color': '#006633'  # Verde oscuro
        })
        
        # === HOJA DE INFORMACIÓN ===
        info_sheet = workbook.add_worksheet('Información')
        info_sheet.set_column('A:A', 20)
        info_sheet.set_column('B:B', 40)
        
        # Título del reporte
        if report_type == "alerts-summary":
            report_title = f"{title} - RESUMEN DE ALERTAS"
        elif report_type == "camera-activity":
            report_title = f"{title} - ACTIVIDAD POR CÁMARA"
        else:
            report_title = f"{title} - REPORTE COMPLETO"
            
        info_sheet.merge_range('A1:B1', report_title, title_format)
        
        # Información del reporte
        info_data = [
            ['Generado el', datetime.now().strftime('%d/%m/%Y - %H:%M:%S')],
            ['Usuario', user_info['nombre_usuario']],
            ['Nombre completo', f"{user_info['nombres']} {user_info['apellidos']}"],
            ['Período', '']
        ]
        
        # Determinar período del reporte
        if date_range == 'day':
            info_data[3][1] = "Último día"
        elif date_range == 'week':
            info_data[3][1] = "Última semana"
        elif date_range == 'month':
            info_data[3][1] = "Último mes"
        elif date_range == 'custom' and start_date and end_date:
            info_data[3][1] = f"Del {start_date} al {end_date}"
        
        # Escribir información
        info_sheet.write(2, 0, "INFORMACIÓN DEL REPORTE", subheader_format)
        info_sheet.write(2, 1, "", subheader_format)
        
        row = 3
        for item in info_data:
            info_sheet.write(row, 0, item[0], cell_format)
            info_sheet.write(row, 1, item[1], cell_format)
            row += 1
        
        # === HOJA DE ESTADÍSTICAS ===
        if stats:
            stats_sheet = workbook.add_worksheet('Estadísticas')
            stats_sheet.set_column('A:A', 25)
            stats_sheet.set_column('B:B', 15)
            stats_sheet.set_column('C:C', 40)
            
            # Título
            stats_sheet.merge_range('A1:C1', 'RESUMEN ESTADÍSTICO', title_format)
            
            # Cabeceras
            stats_sheet.write(2, 0, 'Métrica', header_format)
            stats_sheet.write(2, 1, 'Valor', header_format)
            stats_sheet.write(2, 2, 'Representación', header_format)
            
            # Datos de estadísticas
            metrics = [
                ['Total Alertas', stats['total_alerts'], ''],
                ['Alertas Recientes (24h)', stats['recent_alerts'], ''],
                ['Alertas Revisadas', stats['reviewed_alerts'], '']
            ]
            
            # Calcular porcentaje de revisadas
            if stats['total_alerts'] > 0:
                reviewed_percentage = int((stats['reviewed_alerts'] / stats['total_alerts']) * 100)
                metrics.append(['Porcentaje de Revisión', f"{reviewed_percentage}%", ''])
            
            # Añadir representación visual
            for i, metric in enumerate(metrics):
                value = metric[1]
                if isinstance(value, int):
                    # Representación visual con caracteres
                    if i == 0:  # Total alertas
                        metric[2] = '■' * min(20, int(value / 5 + 1))
                    elif i == 1:  # Alertas recientes
                        metric[2] = '●' * min(20, int(value / 2 + 1))
                    elif i == 2:  # Alertas revisadas
                        metric[2] = '✓' * min(20, int(value / 5 + 1))
            
            # Escribir datos
            row = 3
            for metric in metrics:
                stats_sheet.write(row, 0, metric[0], cell_format)
                stats_sheet.write(row, 1, metric[1], cell_format)
                stats_sheet.write(row, 2, metric[2], cell_format)
                row += 1
            
            # Agregar gráficos si hay suficientes datos
            if stats['total_alerts'] > 0:
                chart = workbook.add_chart({'type': 'column'})
                
                # Organizar datos para el gráfico
                stats_sheet.write_column('E3', ['Total', 'Recientes (24h)', 'Revisadas'])
                stats_sheet.write_column('F3', [stats['total_alerts'], stats['recent_alerts'], stats['reviewed_alerts']])
                
                # Configurar el gráfico
                chart.add_series({
                    'name': 'Alertas',
                    'categories': ['Estadísticas', 2, 4, 4, 4],
                    'values': ['Estadísticas', 2, 5, 4, 5],
                    'fill': {'color': '#4472C4'},
                    'data_labels': {'value': True}
                })
                
                chart.set_title({'name': 'Resumen de Alertas'})
                chart.set_legend({'position': 'none'})
                
                # Insertar el gráfico
                stats_sheet.insert_chart('A10', chart, {'x_offset': 25, 'y_offset': 10, 'x_scale': 1.5, 'y_scale': 1.2})
        
        # === HOJA DE ANÁLISIS POR CÁMARA (para report_type camera-activity) ===
        if charts_data and 'by_camera' in charts_data and len(charts_data['by_camera']['labels']) > 0 and (report_type == 'camera-activity' or report_type == 'complete'):
            camera_sheet = workbook.add_worksheet('Análisis por Cámara')
            camera_sheet.set_column('A:A', 30)  # Nombre de cámara
            camera_sheet.set_column('B:B', 15)  # Total alertas
            camera_sheet.set_column('C:C', 15)  # Porcentaje
            
            # Título
            camera_sheet.merge_range('A1:C1', 'ANÁLISIS DE ACTIVIDAD POR CÁMARA', title_format)
            
            # Cabeceras
            camera_sheet.write(2, 0, 'Posición de Cámara', header_format)
            camera_sheet.write(2, 1, 'Total Alertas', header_format)
            camera_sheet.write(2, 2, '% del Total', header_format)
            
            # Calcular total
            total_alerts = sum(charts_data['by_camera']['data'])
            
            # Escribir datos
            for i, cam in enumerate(charts_data['by_camera']['labels']):
                row = i + 3
                count = charts_data['by_camera']['data'][i]
                percentage = (count / total_alerts * 100) if total_alerts > 0 else 0
                
                camera_sheet.write(row, 0, cam, cell_format)
                camera_sheet.write(row, 1, count, cell_format)
                camera_sheet.write(row, 2, f"{percentage:.1f}%", cell_format)
            
            # Agregar gráfico circular
            if total_alerts > 0:
                pie_chart = workbook.add_chart({'type': 'pie'})
                
                # Calcular rango de datos
                last_row = 2 + len(charts_data['by_camera']['labels'])
                
                # Añadir serie al gráfico
                pie_chart.add_series({
                    'name': 'Distribución por Cámara',
                    'categories': ['Análisis por Cámara', 3, 0, last_row, 0],
                    'values': ['Análisis por Cámara', 3, 1, last_row, 1],
                    'data_labels': {'percentage': True, 'category': True, 'separator': "\n"},
                    'points': [{'fill': {'color': f'#{hash(label) & 0xFFFFFF:06x}'}} for label in charts_data['by_camera']['labels']]
                })
                
                pie_chart.set_title({'name': 'Distribución de Alertas por Cámara'})
                pie_chart.set_style(10)
                
                # Insertar gráfico
                camera_sheet.insert_chart('E3', pie_chart, {'x_offset': 25, 'y_offset': 10, 'x_scale': 1.5, 'y_scale': 1.5})
            
            # Si es de tipo camera-activity, añadir gráfico de tendencia si está disponible
            if report_type == 'camera-activity' and 'trend' in charts_data and len(charts_data['trend']['labels']) > 0:
                line_chart = workbook.add_chart({'type': 'line'})
                
                # Preparar datos para el gráfico
                camera_sheet.write_range('A20:B20', [['Semana', 'Alertas']], subheader_format)
                
                for i, label in enumerate(charts_data['trend']['labels']):
                    row = 21 + i
                    camera_sheet.write(row, 0, label, cell_format)
                    camera_sheet.write(row, 1, charts_data['trend']['datasets'][0]['data'][i], cell_format)
                
                # Añadir serie al gráfico
                last_trend_row = 20 + len(charts_data['trend']['labels'])
                line_chart.add_series({
                    'name': 'Evolución de Alertas',
                    'categories': ['Análisis por Cámara', 21, 0, last_trend_row, 0],
                    'values': ['Análisis por Cámara', 21, 1, last_trend_row, 1],
                    'marker': {'type': 'circle', 'size': 8},
                    'data_labels': {'value': True},
                    'line': {'width': 2.5, 'color': '#4472C4'}
                })
                
                line_chart.set_title({'name': 'Evolución de Alertas por Semana'})
                line_chart.set_legend({'position': 'none'})
                line_chart.set_x_axis({'name': 'Semana'})
                line_chart.set_y_axis({'name': 'Número de Alertas'})
                
                # Insertar gráfico después del gráfico circular
                camera_sheet.insert_chart('E20', line_chart, {'x_offset': 25, 'y_offset': 10, 'x_scale': 1.5, 'y_scale': 1.2})
        
        # === HOJA DE ALERTAS ===
        if alerts_data:
            alerts_sheet = workbook.add_worksheet('Alertas')
            
            # Configurar anchos de columna
            alerts_sheet.set_column('A:A', 25)  # Cámara
            alerts_sheet.set_column('B:B', 35)  # Descripción
            alerts_sheet.set_column('C:C', 12)  # Fecha
            alerts_sheet.set_column('D:D', 12)  # Hora
            alerts_sheet.set_column('E:E', 12)  # Estado
            
            # Título adaptado al tipo de reporte
            if report_type == "alerts-summary":
                alerts_title = "DETALLE DE ALERTAS REGISTRADAS"
            else:
                alerts_title = "LISTADO DE ALERTAS"
                
            alerts_sheet.merge_range('A1:E1', alerts_title, title_format)
            
            # Escribir cabeceras
            headers = ['Cámara', 'Descripción', 'Fecha', 'Hora', 'Estado']
            for col, header in enumerate(headers):
                alerts_sheet.write(2, col, header, header_format)
            
            # Determinar límite de alertas según tipo de reporte
            if report_type == "alerts-summary":
                alert_limit = min(50, len(alerts_data))  # Más alertas para resumen
                alerts_sheet.write(3 + alert_limit, 0, f"* Se muestran {alert_limit} de {len(alerts_data)} alertas", workbook.add_format({'italic': True}))
            elif report_type == "camera-activity":
                alert_limit = min(15, len(alerts_data))  # Menos alertas para análisis por cámara
                if len(alerts_data) > alert_limit:
                    alerts_sheet.write(3 + alert_limit, 0, f"* Se muestran las {alert_limit} alertas más recientes", workbook.add_format({'italic': True}))
            else:
                alert_limit = len(alerts_data)  # Todas las alertas para reporte completo
            
            # Escribir datos de alertas con formato condicional
            for i, alert in enumerate(alerts_data[:alert_limit]):
                row = i + 3
                
                # Alternar colores de fondo en filas para mejor legibilidad
                row_format = cell_format
                if i % 2 == 0:
                    row_format = workbook.add_format({
                        'border': 1,
                        'align': 'center',
                        'valign': 'vcenter',
                        'bg_color': '#F2F2F2'  # Gris muy claro
                    })
                
                # Formato para estado (revisado/pendiente)
                status_format = cell_alert_reviewed if alert['revisado'] else cell_alert_pending
                
                alerts_sheet.write(row, 0, alert['nombre_posicion'], row_format)
                alerts_sheet.write(row, 1, alert['descripcion'], row_format)
                alerts_sheet.write(row, 2, alert['fecha_evento'], date_format)
                alerts_sheet.write(row, 3, alert['hora_evento'], time_format)
                alerts_sheet.write(row, 4, "✓ Revisada" if alert['revisado'] else "⚠ Pendiente", status_format)
                
            # Añadir filtros a las cabeceras
            alerts_sheet.autofilter(2, 0, 2 + alert_limit, 4)
            
            # Si es reporte de resumen de alertas, añadir gráfico de alertas por día
            if report_type == "alerts-summary" and charts_data and 'by_day' in charts_data:
                bar_chart = workbook.add_chart({'type': 'column'})
                
                # Agregar datos para el gráfico
                row = 4 + alert_limit + 2  # Dejar espacio después de la tabla
                alerts_sheet.write_row(row, 0, ['Día', 'Cantidad'], subheader_format)
                
                for i, day in enumerate(charts_data['by_day']['labels']):
                    alerts_sheet.write(row + 1 + i, 0, day, cell_format)
                    alerts_sheet.write(row + 1 + i, 1, charts_data['by_day']['data'][i], cell_format)
                
                # Configurar el gráfico
                bar_chart.add_series({
                    'name': 'Alertas',
                    'categories': ['Alertas', row + 1, 0, row + 7, 0],
                    'values': ['Alertas', row + 1, 1, row + 7, 1],
                    'data_labels': {'value': True},
                    'fill': {'color': '#4472C4'}
                })
                
                bar_chart.set_title({'name': 'Alertas por Día de la Semana'})
                bar_chart.set_legend({'position': 'none'})
                bar_chart.set_x_axis({'name': 'Día'})
                bar_chart.set_y_axis({'name': 'Número de Alertas'})
                
                # Insertar el gráfico
                chart_row = row + 12
                alerts_sheet.insert_chart(f'A{chart_row}', bar_chart, {'x_offset': 25, 'y_offset': 10, 'x_scale': 1.5, 'y_scale': 1.2})
        
        # === HOJA DE RESUMEN DIARIO (solo para reporte completo) ===
        if report_type == "complete" and charts_data and 'by_day' in charts_data:
            daily_sheet = workbook.add_worksheet('Resumen Diario')
            daily_sheet.set_column('A:A', 15)  # Día
            daily_sheet.set_column('B:B', 15)  # Número de alertas
            daily_sheet.set_column('C:C', 15)  # Porcentaje
            
            # Título
            daily_sheet.merge_range('A1:C1', 'DISTRIBUCIÓN DE ALERTAS POR DÍA', title_format)
            
            # Cabeceras
            daily_sheet.write(2, 0, 'Día', header_format)
            daily_sheet.write(2, 1, 'Alertas', header_format)
            daily_sheet.write(2, 2, '% del Total', header_format)
            
            # Calcular total
            total_day_alerts = sum(charts_data['by_day']['data'])
            
            # Escribir datos
            for i, day in enumerate(charts_data['by_day']['labels']):
                row = i + 3
                count = charts_data['by_day']['data'][i]
                percentage = (count / total_day_alerts * 100) if total_day_alerts > 0 else 0
                
                # Alternar colores de fondo
                row_format = cell_format
                if i % 2 == 1:
                    row_format = workbook.add_format({
                        'border': 1,
                        'align': 'center',
                        'valign': 'vcenter',
                        'bg_color': '#F2F2F2'  # Gris muy claro
                    })
                
                daily_sheet.write(row, 0, day, row_format)
                daily_sheet.write(row, 1, count, row_format)
                daily_sheet.write(row, 2, f"{percentage:.1f}%", row_format)
            
            # Agregar gráfico de barras
            if total_day_alerts > 0:
                day_chart = workbook.add_chart({'type': 'column'})
                
                # Añadir serie al gráfico
                day_chart.add_series({
                    'name': 'Alertas por Día',
                    'categories': ['Resumen Diario', 3, 0, 9, 0],
                    'values': ['Resumen Diario', 3, 1, 9, 1],
                    'data_labels': {'value': True},
                    'fill': {'color': '#4472C4'}
                })
                
                day_chart.set_title({'name': 'Distribución de Alertas por Día'})
                day_chart.set_legend({'position': 'none'})
                day_chart.set_x_axis({'name': 'Día de la Semana'})
                day_chart.set_y_axis({'name': 'Número de Alertas'})
                
                # Insertar gráfico
                daily_sheet.insert_chart('E3', day_chart, {'x_offset': 25, 'y_offset': 10, 'x_scale': 1.5, 'y_scale': 1.5})
    
    return file_path

# Función para generar reportes CSV
def generate_csv_report(alerts_data, filename):
    import pandas as pd
    import os
    
    # Crear directorio para reportes si no existe
    if not os.path.exists(REPORTS_DIR):
        os.makedirs(REPORTS_DIR)
    
    base_path = os.path.join(REPORTS_DIR, filename)
    file_path = get_unique_filename(base_path, 'csv')
    
    # Convertir datos de alertas a DataFrame
    if alerts_data:
        alerts_df = pd.DataFrame(alerts_data)
        alerts_df.rename(columns={
            'nombre_posicion': 'Camara',
            'descripcion': 'Descripcion',
            'fecha_evento': 'Fecha',
            'hora_evento': 'Hora',
            'revisado': 'Revisado'
        }, inplace=True)
        
        
        alerts_df['Revisado'] = alerts_df['Revisado'].apply(lambda x: 'Si' if x else 'No')
        
        # Excluir columna id_evento
        if 'id_evento' in alerts_df.columns:
            alerts_df = alerts_df.drop('id_evento', axis=1)
        
        
        alerts_df.to_csv(file_path, index=False)
    else:
        
        with open(file_path, 'w') as f:
            f.write("No hay datos disponibles para el reporte")
    
    return file_path

# Ruta para descargar reportes generados