import math
from app.engine.marginal import _single_resource_base_net
from app.schemas.simulation import PipelineRequest, PipelineResult, PipelineStageResult


def analyze_pipeline(req: PipelineRequest) -> PipelineResult:
    """Evalúa el flujo encadenado Liquidación -> Armado -> Auditoría -> Radicación con muestreo y pools compartidos."""
    stage_results: list[PipelineStageResult] = []
    pool_utils: dict[str, float] = {}
    pool_base_demands: dict[str, float] = {}
    pool_exact_units: dict[str, float] = {}

    # Primera pasada: calcular demanda efectiva y utilización individual por etapa
    raw_items: list[tuple] = []
    for stage in req.stages:
        incoming = stage.process.expected_monthly_demand * stage.pass_through_rate
        effective = incoming * (1.0 + stage.process.rework_return_rate)
        unit_cap = _single_resource_base_net(stage.process, stage.resource)
        stage_cap = unit_cap * stage.assigned_count
        util = (effective / stage_cap if stage_cap > 0 else float("inf")) if incoming > 0 else 0.0
        exact_units = (effective / unit_cap if unit_cap > 0 else float(stage.assigned_count)) if incoming > 0 else 0.0

        if stage.shared_pool:
            pool_utils[stage.shared_pool] = pool_utils.get(stage.shared_pool, 0.0) + util
            pool_base_demands[stage.shared_pool] = max(
                pool_base_demands.get(stage.shared_pool, 0.0),
                stage.process.expected_monthly_demand,
            )
            pool_exact_units[stage.shared_pool] = pool_exact_units.get(stage.shared_pool, 0.0) + exact_units

        raw_items.append((stage, incoming, effective, unit_cap, stage_cap, util, exact_units))

    bottleneck_name = ""
    max_util = -1.0
    min_throughput = float("inf")

    for stage, incoming, effective, unit_cap, stage_cap, util, exact_units in raw_items:
        pool_name = stage.shared_pool
        effective_util = pool_utils[pool_name] if pool_name else util
        recommended = (
            max(1, math.ceil(pool_exact_units[pool_name]))
            if pool_name and pool_exact_units[pool_name] > 0
            else (max(1, math.ceil(exact_units)) if exact_units > 0 else 0)
        )

        if effective_util > max_util and (incoming > 0 or (pool_name and effective_util > 0)):
            max_util = effective_util
            bottleneck_name = stage.process.name

        if pool_name:
            if pool_utils[pool_name] > 0:
                net_throughput = pool_base_demands[pool_name] / pool_utils[pool_name]
                min_throughput = min(min_throughput, net_throughput)
        elif incoming > 0:
            denom = stage.pass_through_rate * (1.0 + stage.process.rework_return_rate)
            net_throughput = stage_cap / denom if denom > 0 else float("inf")
            min_throughput = min(min_throughput, net_throughput)

        stage_results.append(
            PipelineStageResult(
                process_name=stage.process.name,
                category=stage.process.category,
                incoming_demand=round(incoming, 2),
                effective_demand_with_rework=round(effective, 2),
                stage_monthly_capacity=round(stage_cap, 2),
                utilization_rate=round(util, 4),
                is_bottleneck=False,
                recommended_count=recommended,
                pass_through_rate=stage.pass_through_rate,
                shared_pool=pool_name,
                pool_utilization_rate=round(pool_utils[pool_name], 4) if pool_name else None,
            )
        )

    for res in stage_results:
        if res.process_name == bottleneck_name:
            res.is_bottleneck = True

    if min_throughput == float("inf"):
        min_throughput = 0.0

    return PipelineResult(
        stages=stage_results,
        bottleneck_stage=bottleneck_name or (stage_results[0].process_name if stage_results else ""),
        max_end_to_end_monthly_throughput=round(min_throughput, 2),
    )
