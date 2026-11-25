from pathlib import Path
from app.services.excel_io import export_baseline_to_excel, parse_excel_processes


def test_parse_real_project_excel():
    root = Path(__file__).resolve().parents[2]
    xls_path = root / "Herramienta Rendimientos marginales-Personal.xlsx"
    if not xls_path.exists():
        return
    processes = parse_excel_processes(xls_path.read_bytes())
    assert len(processes) >= 5
    categories = {p.category for p in processes}
    assert "radicacion" in categories
    assert "devoluciones" in categories


def test_parse_ejemplo_excel_armado_cuentas():
    root = Path(__file__).resolve().parents[2]
    xls_path = root / "Herramienta Rendimientos marginales(ejemplo).xlsx"
    if not xls_path.exists():
        return
    processes = parse_excel_processes(xls_path.read_bytes())
    categories = {p.category for p in processes}
    assert "armado_cuentas" in categories


def test_export_excel_bytes():
    data = export_baseline_to_excel(
        [
            {
                "process_name": "Radicación",
                "effective_demand": 18394.75,
                "optimal_daily_production": 836.12,
                "optimal_hourly_production": 104.52,
                "net_monthly_capacity_per_resource": 3168.0,
                "required_resources_exact": 5.8064,
                "required_resources_rounded": 6,
                "utilization_rate": 0.9677,
                "benchmark_status": "en_estandar",
            }
        ]
    )
    assert data[:2] == b"PK"
