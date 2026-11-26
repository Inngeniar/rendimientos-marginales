import math
from app.engine.marginal import _single_resource_base_net
from app.schemas.simulation import PipelineRequest, PipelineResult, PipelineStageResult


def analyze_pipeline(req: PipelineRequest) -> PipelineResult:
    """Evalúa el flujo encadenado Liquidación -> Armado -> Auditoría -> Radicación con muestreo, mix H+B y pools."""
    stage_results: list[PipelineStageResult] = []
    pool_utils: dict[str, float] = {}
    pool_base_demands: dict[str, float] = {}
    pool_exact_units: dict[str, float] = {}

    raw_items: list[tuple] = []
    for stage in req.stages:
        incoming = stage.process.expected_monthly_demand * stage.pass_through_rate
        effective = incoming * (1.0 + stage.process.rework_return_rate)

        is_mixed = stage.bot_resource is not None and stage.assigned_bots > 0 and stage.assigned_count > 0
        if is_mixed and stage.bot_resource is not None:
            human_unit = _single_resource_base_net(stage.process, stage.resource)
            bot_unit = _single_resource_base_net(stage.process, stage.bot_resource)
            human_cap = human_unit * stage.assigned_count
            bot_cap = bot_unit * stage.assigned_bots
            escalation = stage.bot_resource.exception_escalation_rate
            bot_handled = min(bot_cap, effective * (1.0 - escalation)) if incoming > 0 else 0.0
            human_needed = max(0.0, effective - bot_handled) if incoming > 0 else 0.0
            bot_util = (bot_handled / bot_cap if bot_cap > 0 else float("inf")) if bot_handled > 0 else 0.0
            human_util = (human_needed / human_cap if human_cap > 0 else float("inf")) if human_needed > 0 else 0.0
            util = max(bot_util, human_util)
            stage_cap = bot_cap + human_cap
            unit_cap = bot_unit if bot_util >= human_util else human_unit
            exact_units = (
                (bot_handled / bot_unit if bot_unit > 0 else float(stage.assigned_bots))
                if bot_util >= human_util
                else (human_needed / human_unit if human_unit > 0 else float(stage.assigned_count))
            )
            pool_util_contrib = bot_util
            pool_exact_contrib = bot_handled / bot_unit if bot_unit > 0 else 0.0
        else:
            unit_cap = _single_resource_base_net(stage.process, stage.resource)
            count = max(stage.assigned_count, stage.assigned_bots) if stage.resource.resource_type == "bot" else stage.assigned_count
            stage_cap = unit_cap * count
            util = (effective / stage_cap if stage_cap > 0 else float("inf")) if incoming > 0 else 0.0
            exact_units = (effective / unit_cap if unit_cap > 0 else float(count)) if incoming > 0 else 0.0
            human_util = util if stage.resource.resource_type == "human" else None
            bot_util = util if stage.resource.resource_type == "bot" else None
            pool_util_contrib = util
            pool_exact_contrib = exact_units

        if stage.shared_pool:
            pool_utils[stage.shared_pool] = pool_utils.get(stage.shared_pool, 0.0) + pool_util_contrib
            pool_base_demands[stage.shared_pool] = max(
                pool_base_demands.get(stage.shared_pool, 0.0),
                stage.process.expected_monthly_demand,
            )
            pool_exact_units[stage.shared_pool] = pool_exact_units.get(stage.shared_pool, 0.0) + pool_exact_contrib

        raw_items.append((stage, incoming, effective, unit_cap, stage_cap, util, exact_units, human_util, bot_util, is_mixed))

    bottleneck_name = ""
    max_util = -1.0
    min_throughput = float("inf")

    for stage, incoming, effective, unit_cap, stage_cap, util, exact_units, human_util, bot_util, is_mixed in raw_items:
        pool_name = stage.shared_pool
        effective_util = max(pool_utils[pool_name], util) if pool_name else util

        if pool_name and pool_exact_units[pool_name] > 0:
            recommended = max(1, math.ceil(pool_exact_units[pool_name]))
            safe_rec = max(1, math.ceil(pool_exact_units[pool_name] / 0.85))
        elif exact_units > 0:
            recommended = max(1, math.ceil(exact_units))
            safe_rec = max(1, math.ceil(exact_units / 0.85))
        else:
            recommended = 0
            safe_rec = 0

        if effective_util > max_util and (incoming > 0 or (pool_name and effective_util > 0)):
            max_util = effective_util
            bottleneck_name = stage.process.name

        if pool_name and pool_utils[pool_name] > 0:
            net_throughput = pool_base_demands[pool_name] / pool_utils[pool_name]
            min_throughput = min(min_throughput, net_throughput)
        elif incoming > 0:
            denom = stage.pass_through_rate * (1.0 + stage.process.rework_return_rate)
            net_throughput = stage_cap / denom if denom > 0 else float("inf")
            if is_mixed and util > 0:
                net_throughput = stage.process.expected_monthly_demand / util
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
                safe_recommended_count=safe_rec,
                pass_through_rate=stage.pass_through_rate,
                shared_pool=pool_name,
                pool_utilization_rate=round(pool_utils[pool_name], 4) if pool_name else None,
                human_utilization_rate=round(human_util, 4) if human_util is not None else None,
                bot_utilization_rate=round(bot_util, 4) if bot_util is not None else None,
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
