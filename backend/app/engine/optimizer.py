import math
from app.engine.marginal import _single_resource_base_net
from app.schemas.simulation import MixOptimizeRequest, MixOptimizeResult


def optimize_human_bot_mix(req: MixOptimizeRequest) -> MixOptimizeResult:
    """Encuentra la combinación entera óptima (Humanos, Bots) considerando escalamiento de excepciones."""
    effective_demand = req.process.expected_monthly_demand * (1.0 + req.process.rework_return_rate)
    human_cap = _single_resource_base_net(req.process, req.human_profile)
    bot_cap = _single_resource_base_net(req.process, req.bot_profile)

    escalation = req.bot_profile.exception_escalation_rate
    max_automatable_share = 1.0 - escalation

    best_score = float("inf") if req.objective == "min_cost" else -1.0
    best_solution: tuple[int, int, float, float, float] | None = None

    for b in range(0, req.max_bots + 1):
        # Un bot solo puede absorber hasta la fracción no escalada de la demanda
        bot_handled = min(b * bot_cap, effective_demand * max_automatable_share)
        remaining_for_humans = max(0.0, effective_demand - bot_handled)

        if remaining_for_humans <= 1e-9:
            h = 0
        elif human_cap <= 0:
            continue
        else:
            h = math.ceil(remaining_for_humans / human_cap)

        if h > req.max_humans:
            continue

        total_cost = h * req.human_profile.monthly_cost + b * req.bot_profile.monthly_cost
        total_cap = bot_handled + h * human_cap

        if req.objective == "min_cost":
            if total_cost < best_score:
                best_score = total_cost
                best_solution = (h, b, total_cost, total_cap, bot_handled)
        else:
            if total_cap > best_score:
                best_score = total_cap
                best_solution = (h, b, total_cost, total_cap, bot_handled)

    if best_solution is None:
        max_bot_handled = min(req.max_bots * bot_cap, effective_demand * max_automatable_share)
        max_total_cap = max_bot_handled + req.max_humans * human_cap
        max_total_cost = req.max_humans * req.human_profile.monthly_cost + req.max_bots * req.bot_profile.monthly_cost
        return MixOptimizeResult(
            feasible=False,
            optimal_humans=req.max_humans,
            optimal_bots=req.max_bots,
            total_monthly_cost=round(max_total_cost, 2),
            total_monthly_capacity=round(max_total_cap, 2),
            escalated_demand_to_humans=round(max(0.0, effective_demand - max_bot_handled), 2),
            bot_handled_demand=round(max_bot_handled, 2),
            optimal_daily_production=0.0,
            optimal_hourly_production=0.0,
            cost_per_invoice=round(max_total_cost / max_total_cap, 2) if max_total_cap > 0 else 0.0,
            notes="Capacidad máxima configurada insuficiente para cubrir la demanda efectiva.",
        )

    opt_h, opt_b, opt_cost, opt_cap, opt_bot_handled = best_solution
    escalated = effective_demand - opt_bot_handled
    days = (
        min(req.human_profile.available_days_per_month, req.process.sla_deadline_days)
        if req.process.sla_deadline_days
        else req.human_profile.available_days_per_month
    )
    opt_daily = effective_demand / days
    opt_hourly = opt_daily / req.human_profile.available_hours_per_day
    cost_per_inv = opt_cost / effective_demand if effective_demand > 0 else 0.0

    return MixOptimizeResult(
        feasible=True,
        optimal_humans=opt_h,
        optimal_bots=opt_b,
        total_monthly_cost=round(opt_cost, 2),
        total_monthly_capacity=round(opt_cap, 2),
        escalated_demand_to_humans=round(escalated, 2),
        bot_handled_demand=round(opt_bot_handled, 2),
        optimal_daily_production=round(opt_daily, 2),
        optimal_hourly_production=round(opt_hourly, 2),
        cost_per_invoice=round(cost_per_inv, 2),
        notes=f"Mix óptimo: {opt_h} humano(s) y {opt_b} bot(s) RPA. Escalamiento humano: {escalated:.0f} facturas/mes.",
    )
