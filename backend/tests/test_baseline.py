import pytest
from app.engine.baseline import compute_baseline
from app.schemas.process import ProcessConfig
from app.schemas.resource import ResourceProfile


def test_baseline_matches_excel_radicacion():
    # Valida contra hoja 'Radicación' de Herramienta Rendimientos marginales-Personal.xlsx
    proc = ProcessConfig(
        name="Radicación",
        category="radicacion",
        complexity="baja",
        expected_monthly_demand=18394.75,
        avg_time_minutes=3.0,
        working_days_per_month=22,
        effective_hours_per_day=8.0,
        base_inefficiency_rate=0.10,
    )
    res = compute_baseline(proc)
    assert res.raw_daily_capacity_per_resource == pytest.approx(160.0, rel=1e-4)
    assert res.monthly_capacity_per_resource == pytest.approx(3520.0, rel=1e-4)
    assert res.net_monthly_capacity_per_resource == pytest.approx(3168.0, rel=1e-4)
    assert res.required_resources_exact == pytest.approx(5.8064, rel=1e-3)
    assert res.required_resources_rounded == 6


def test_baseline_matches_excel_rpa_bot():
    # Valida contra hoja 'RPA' (Facturas Ambulatorias)
    proc = ProcessConfig(
        name="RPA Ambulatorio",
        category="radicacion",
        complexity="baja",
        expected_monthly_demand=14000.0,
        avg_time_minutes=2.0,
        working_days_per_month=30,
        effective_hours_per_day=12.0,
        base_inefficiency_rate=0.03,
    )
    bot = ResourceProfile(
        resource_type="bot",
        available_hours_per_day=12.0,
        available_days_per_month=30,
        inefficiency_rate=0.03,
    )
    res = compute_baseline(proc, bot)
    assert res.raw_daily_capacity_per_resource == pytest.approx(360.0, rel=1e-4)
    assert res.net_monthly_capacity_per_resource == pytest.approx(10476.0, rel=1e-4)
    assert res.required_resources_exact == pytest.approx(1.3364, rel=1e-3)
    assert res.required_resources_rounded == 2
