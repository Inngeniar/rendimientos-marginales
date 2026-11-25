import math
from app.engine.benchmarks import get_benchmark
from app.schemas.process import ProcessConfig
from app.schemas.resource import ResourceProfile
from app.schemas.simulation import BaselineResult


def _evaluate_benchmark_status(
    hourly_rate: float,
    resource_type: str,
    process: ProcessConfig,
) -> str:
    if resource_type == "bot":
        return "bot_rpa"
    bench = get_benchmark(process.category, process.complexity)
    if bench is None:
        return "sin_referencia"
    if hourly_rate < bench.min_per_hour_human:
        return f"por_debajo_estandar ({bench.min_per_hour_human}-{bench.max_per_hour_human}/h)"
    if hourly_rate > bench.max_per_hour_human:
        return f"por_encima_estandar ({bench.min_per_hour_human}-{bench.max_per_hour_human}/h)"
    return f"en_estandar ({bench.min_per_hour_human}-{bench.max_per_hour_human}/h)"


def compute_baseline(
    process: ProcessConfig,
    resource: ResourceProfile | None = None,
) -> BaselineResult:
    """Calcula la capacidad lineal y dotación requerida (compatible con el modelo Excel base)."""
    res = resource or ResourceProfile(
        available_hours_per_day=process.effective_hours_per_day,
        available_days_per_month=process.working_days_per_month,
        inefficiency_rate=process.base_inefficiency_rate,
    )

    hours = res.available_hours_per_day
    days = min(res.available_days_per_month, process.sla_deadline_days) if process.sla_deadline_days else res.available_days_per_month
    ineff = max(res.inefficiency_rate, process.base_inefficiency_rate) if resource is None else res.inefficiency_rate

    effective_time_min = process.avg_time_minutes / res.speed_multiplier
    raw_hourly = (60.0 / effective_time_min) * res.learning_curve_factor
    raw_daily = raw_hourly * hours
    monthly_per_res = raw_daily * days
    net_monthly_per_res = monthly_per_res * (1.0 - ineff)

    effective_demand = process.expected_monthly_demand * (1.0 + process.rework_return_rate)
    required_exact = effective_demand / net_monthly_per_res if net_monthly_per_res > 0 else float("inf")
    required_rounded = max(1, math.ceil(required_exact))

    optimal_daily = effective_demand / days
    optimal_hourly = optimal_daily / hours

    total_assigned_capacity = net_monthly_per_res * required_rounded
    utilization = effective_demand / total_assigned_capacity if total_assigned_capacity > 0 else 1.0

    return BaselineResult(
        process_name=process.name,
        effective_demand=round(effective_demand, 2),
        raw_daily_capacity_per_resource=round(raw_daily, 4),
        raw_hourly_capacity_per_resource=round(raw_hourly, 4),
        monthly_capacity_per_resource=round(monthly_per_res, 4),
        net_monthly_capacity_per_resource=round(net_monthly_per_res, 4),
        optimal_daily_production=round(optimal_daily, 2),
        optimal_hourly_production=round(optimal_hourly, 2),
        required_resources_exact=round(required_exact, 4),
        required_resources_rounded=required_rounded,
        current_headcount=res.current_headcount,
        headcount_gap=required_rounded - res.current_headcount,
        utilization_rate=round(utilization, 4),
        benchmark_status=_evaluate_benchmark_status(raw_hourly, res.resource_type, process),
    )
