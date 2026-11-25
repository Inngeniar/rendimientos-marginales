from io import BytesIO
from openpyxl import Workbook, load_workbook
from app.schemas.process import ProcessCategory, ProcessConfig


def _infer_category(sheet_name: str, title: str) -> ProcessCategory:
    text = f"{sheet_name} {title}".lower()
    if "armado" in text or "rpa" in text:
        return "armado_cuentas"
    if "auditor" in text:
        return "auditoria"
    if "radica" in text:
        return "radicacion"
    if "devoluc" in text or "glosa" in text:
        return "devoluciones"
    return "liquidacion"


def parse_excel_processes(file_bytes: bytes) -> list[ProcessConfig]:
    """Extrae bloques de procesos compatibles con las plantillas Excel del proyecto."""
    wb = load_workbook(BytesIO(file_bytes), data_only=True)
    processes: list[ProcessConfig] = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        current_title = sheet_name
        block: dict[str, float] = {}

        for row in ws.iter_rows(values_only=True):
            cells = [c for c in row if c is not None]
            if not cells:
                continue

            # Detecta encabezado de bloque (ej. columna B con texto único)
            if len(cells) == 1 and isinstance(cells[0], str) and len(cells[0].strip()) > 2:
                if "producción mensual esperada" not in cells[0].lower():
                    current_title = cells[0].strip()
                continue

            label = str(row[1]).strip().lower() if len(row) > 1 and row[1] is not None else ""
            val = row[2] if len(row) > 2 else None

            if isinstance(val, (int, float)):
                if "producción mensual esperada" in label:
                    block["demand"] = float(val)
                elif "jornada laboral" in label:
                    block["hours"] = float(val)
                elif "días laborales" in label:
                    block["days"] = int(round(float(val)))
                elif "tiempo promedio" in label:
                    block["minutes"] = float(val)
                elif "ineficiencia esperada" in label:
                    block["inefficiency"] = float(val)

            if {"demand", "hours", "days", "minutes", "inefficiency"}.issubset(block.keys()):
                idx = len(processes) + 1
                processes.append(
                    ProcessConfig(
                        id=f"xls-{idx}",
                        name=f"{sheet_name} - {current_title}" if current_title != sheet_name else sheet_name,
                        category=_infer_category(sheet_name, current_title),
                        complexity="alta" if block["minutes"] >= 20 else ("baja" if block["minutes"] <= 6 else "media"),
                        expected_monthly_demand=max(1.0, block["demand"]),
                        avg_time_minutes=max(0.5, block["minutes"]),
                        working_days_per_month=max(1, min(31, int(block["days"]))),
                        effective_hours_per_day=max(0.5, min(24.0, block["hours"])),
                        base_inefficiency_rate=max(0.0, min(0.95, block["inefficiency"])),
                    )
                )
                block = {}

    return processes


def export_baseline_to_excel(rows: list[dict]) -> bytes:
    """Genera un libro Excel con el resumen de capacidad, producción óptima y dotación."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Resumen Rendimientos"

    headers = [
        "Proceso",
        "Demanda Efectiva",
        "Prod. Óptima/Día",
        "Prod. Óptima/Hora",
        "Capacidad Neta/Recurso",
        "Recursos Exactos",
        "Recursos Redondeados",
        "Utilización (%)",
        "Estado Estándar",
    ]
    ws.append(headers)

    for r in rows:
        ws.append(
            [
                r.get("process_name"),
                r.get("effective_demand"),
                r.get("optimal_daily_production"),
                r.get("optimal_hourly_production"),
                r.get("net_monthly_capacity_per_resource"),
                r.get("required_resources_exact"),
                r.get("required_resources_rounded"),
                round(float(r.get("utilization_rate", 0)) * 100, 2),
                r.get("benchmark_status"),
            ]
        )

    out = BytesIO()
    wb.save(out)
    return out.getvalue()
