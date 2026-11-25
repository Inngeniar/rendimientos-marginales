from app.engine.marginal import compute_marginal_analysis
from app.schemas.process import ProcessConfig
from app.schemas.resource import ResourceProfile


def test_marginal_diminishing_returns():
    proc = ProcessConfig(
        name="Auditoría de cuentas",
        category="auditoria",
        complexity="alta",
        expected_monthly_demand=1500.0,
        avg_time_minutes=15.0,
        working_days_per_month=22,
        effective_hours_per_day=8.0,
        rework_return_rate=0.05,
    )
    res_profile = ResourceProfile(
        resource_type="human",
        available_hours_per_day=8.0,
        available_days_per_month=22,
        inefficiency_rate=0.10,
        monthly_cost=3_000_000.0,
    )
    result = compute_marginal_analysis(proc, res_profile, max_staff=10, congestion_alpha=0.04)
    assert len(result.curve) == 10
    # El producto marginal debe ser estrictamente decreciente con alpha > 0
    marginals = [pt.marginal_output for pt in result.curve]
    assert all(marginals[i] > marginals[i + 1] for i in range(len(marginals) - 1))
    assert result.optimal_staff_for_demand >= 1
