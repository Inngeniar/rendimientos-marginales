import math
from app.engine.marginal import _single_resource_base_net
from app.schemas.simulation import PipelineRequest, PipelineResult, PipelineStageResult


def analyze_pipeline(req: PipelineRequest) -> PipelineResult:
    """Evalúa el flujo encadenado Liquidación -> Auditoría -> Radicación y detecta cuellos de botella."""
    stage_results: list[PipelineStageResult] = []
    bottleneck_name = ""
    max_util = -1.0
    min_throughput = float("inf")

    for stage in req.stages:
        incoming = stage.process.expected_monthly_demand
        effective = incoming * (1.0 + stage.process.rework_return_rate)
        unit_cap = _single_resource_base_net(stage.process, stage.resource)
        stage_cap = unit_cap * stage.assigned_count
        util = effective / stage_cap if stage_cap > 0 else float("inf")
        recommended = max(1, math.ceil(effective / unit_cap)) if unit_cap > 0 else stage.assigned_count

        if util > max_util:
            max_util = util
            bottleneck_name = stage.process.name

        # Capacidad neta de salida sin retrabajo
        net_throughput = stage_cap / (1.0 + stage.process.rework_return_rate)
        if net_throughput < min_throughput:
            min_throughput = net_throughput

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
            )
        )

    for res in stage_results:
        if res.process_name == bottleneck_name:
            res.is_bottleneck = True

    return PipelineResult(
        stages=stage_results,
        bottleneck_stage=bottleneck_name,
        max_end_to_end_monthly_throughput=round(min_throughput, 2),
    )
