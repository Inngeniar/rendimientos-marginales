from app.config import settings
from app.schemas.process import ProcessConfig
from app.schemas.resource import ResourceProfile
from app.schemas.simulation import MarginalPoint, MarginalResult


def _single_resource_base_net(process: ProcessConfig, resource: ResourceProfile) -> float:
    days = (
        min(resource.available_days_per_month, process.sla_deadline_days)
        if process.sla_deadline_days
        else resource.available_days_per_month
    )
    effective_time_min = process.avg_time_minutes / resource.speed_multiplier
    raw_daily = (resource.available_hours_per_day * 60.0 / effective_time_min) * resource.learning_curve_factor

    # Penalización por fatiga si la jornada humana supera 8 horas efectivas
    fatigue_factor = 1.0
    if resource.resource_type == "human" and resource.available_hours_per_day > 8.0:
        overtime_ratio = (resource.available_hours_per_day - 8.0) / 8.0
        fatigue_factor = 1.0 / (1.0 + resource.fatigue_exponent * (overtime_ratio ** 1.5))

    return raw_daily * days * (1.0 - resource.inefficiency_rate) * fatigue_factor


def compute_marginal_analysis(
    process: ProcessConfig,
    resource: ResourceProfile,
    max_staff: int = 15,
    congestion_alpha: float = 0.03,
) -> MarginalResult:
    """Modela producto total, medio y marginal decreciente al escalar la dotación."""
    base_net = _single_resource_base_net(process, resource)
    effective_demand = process.expected_monthly_demand * (1.0 + process.rework_return_rate)
    days = (
        min(resource.available_days_per_month, process.sla_deadline_days)
        if process.sla_deadline_days
        else resource.available_days_per_month
    )

    curve: list[MarginalPoint] = []
    prev_total = 0.0
    optimal_staff = max_staff
    found_demand_cover = False
    best_marginal_staff = 1
    best_marginal_output = -1.0

    for n in range(1, max_staff + 1):
        # Ley de rendimientos decrecientes por congestión/coordinación: 1 / (1 + alpha * (n - 1))
        congestion_factor = 1.0 / (1.0 + congestion_alpha * (n - 1))
        total_output = base_net * n * congestion_factor
        avg_output = total_output / n
        marginal_output = total_output - prev_total
        prev_total = total_output

        utilization = min(1.5, effective_demand / total_output) if total_output > 0 else 1.5
        unit_cost = (n * resource.monthly_cost) / min(total_output, effective_demand) if total_output > 0 else 0.0

        if not found_demand_cover and total_output >= effective_demand:
            optimal_staff = n
            found_demand_cover = True

        if marginal_output > best_marginal_output:
            best_marginal_output = marginal_output
            best_marginal_staff = n

        curve.append(
            MarginalPoint(
                staff_count=n,
                total_output=round(total_output, 2),
                average_output=round(avg_output, 2),
                marginal_output=round(marginal_output, 2),
                utilization_rate=round(utilization, 4),
                unit_cost=round(unit_cost, 2),
            )
        )

    optimal_daily = effective_demand / days
    optimal_hourly = optimal_daily / resource.available_hours_per_day

    alert = None
    if not found_demand_cover:
        alert = (
            f"Con {max_staff} recursos ({curve[-1].total_output:.0f} fact/mes) no se cubre la demanda "
            f"efectiva ({effective_demand:.0f} fact/mes). Considere automatización RPA o ampliar días."
        )
    else:
        opt_point = curve[optimal_staff - 1]
        if opt_point.utilization_rate > settings.max_recommended_utilization:
            alert = (
                f"Utilización proyectada de {opt_point.utilization_rate * 100:.1f}% supera el umbral "
                f"recomendado ({settings.max_recommended_utilization * 100:.0f}%). Riesgo de cola/glosas."
            )

    return MarginalResult(
        process_name=process.name,
        optimal_staff_for_demand=optimal_staff,
        max_marginal_efficiency_staff=best_marginal_staff,
        optimal_daily_production=round(optimal_daily, 2),
        optimal_hourly_production=round(optimal_hourly, 2),
        curve=curve,
        bottleneck_alert=alert,
    )
