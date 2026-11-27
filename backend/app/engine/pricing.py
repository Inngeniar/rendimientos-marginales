import math
from app.engine.marginal import _single_resource_base_net
from app.engine.optimizer import optimize_human_bot_mix
from app.schemas.pricing import (
    MonetizationOption,
    PricingSimulationRequest,
    PricingSimulationResult,
    VolumeTierResult,
)
from app.schemas.simulation import MixOptimizeRequest


def _default_tiers_for_process(process_demand: float, human_cap: float) -> list[int]:
    """Genera rangos significativos incluyendo saltos de capacidad y volumen objetivo."""
    base_points = [1500, 3000, 6000, 9000, 12000, 18000, 25000]
    # Agregar múltiplos exactos de capacidad humana para evidenciar saltos de recurso
    if human_cap > 0:
        for mult in (1, 2, 4, 6):
            cap_pt = int(round(human_cap * mult))
            if 300 <= cap_pt <= 30000:
                base_points.append(cap_pt)
    target = int(round(process_demand))
    if target > 0:
        base_points.append(target)
    cleaned = sorted({p for p in base_points if p >= 100})
    # Limitar a 8 rangos bien espaciados
    if len(cleaned) > 8:
        step = len(cleaned) / 8
        sampled = [cleaned[int(i * step)] for i in range(8)]
        if target not in sampled:
            sampled[-1] = target
        cleaned = sorted(set(sampled))
    return cleaned


def simulate_pricing_and_tiers(req: PricingSimulationRequest) -> PricingSimulationResult:
    human_cap = _single_resource_base_net(req.process, req.human_profile)
    tiers_max = req.volume_tiers or _default_tiers_for_process(req.process.expected_monthly_demand, human_cap)
    tiers_max = sorted({v for v in tiers_max if v > 0})

    tier_results: list[VolumeTierResult] = []
    prev_max = 0
    prev_resources = (0, 0)

    for max_vol in tiers_max:
        proc_copy = req.process.model_copy(update={"expected_monthly_demand": float(max_vol)})
        eff_demand = max_vol * (1.0 + req.process.rework_return_rate)
        solo_humans = max(1, math.ceil(eff_demand / human_cap)) if human_cap > 0 else 1

        mix = optimize_human_bot_mix(
            MixOptimizeRequest(
                process=proc_copy,
                human_profile=req.human_profile,
                bot_profile=req.bot_profile,
                max_humans=500,
                max_bots=50,
            )
        )
        op_cost = mix.total_monthly_cost
        unit_cost = op_cost / eff_demand if eff_demand > 0 else 0.0
        rec_unit_price = unit_cost / (1.0 - req.target_margin_pct)
        rec_monthly_price = rec_unit_price * eff_demand

        cur_res = (mix.optimal_humans, mix.optimal_bots)
        if prev_max == 0:
            jump_note = f"Base inicial: {mix.optimal_humans}H + {mix.optimal_bots}B"
        elif cur_res != prev_resources:
            dh = mix.optimal_humans - prev_resources[0]
            db = mix.optimal_bots - prev_resources[1]
            jump_note = f"Salto de capacidad ({dh:+d}H, {db:+d}B)"
        else:
            jump_note = "Misma dotación (mayor eficiencia unitaria)"

        tier_results.append(
            VolumeTierResult(
                tier_label=f"{prev_max + 1:,} – {max_vol:,}".replace(",", "."),
                min_volume=prev_max + 1,
                max_volume=max_vol,
                optimal_humans=mix.optimal_humans,
                optimal_bots=mix.optimal_bots,
                solo_humans_needed=solo_humans,
                monthly_operational_cost=round(op_cost, 2),
                unit_cost_per_invoice=round(unit_cost, 2),
                recommended_unit_price=round(rec_unit_price, 2),
                recommended_monthly_price=round(rec_monthly_price, 2),
                resource_jump_note=jump_note,
            )
        )
        prev_max = max_vol
        prev_resources = cur_res

    # Evaluar modelos de monetización sobre la demanda objetivo actual
    target_eff = req.process.expected_monthly_demand * (1.0 + req.process.rework_return_rate)
    target_mix = optimize_human_bot_mix(
        MixOptimizeRequest(
            process=req.process,
            human_profile=req.human_profile,
            bot_profile=req.bot_profile,
            max_humans=500,
            max_bots=50,
        )
    )
    base_cost = target_mix.total_monthly_cost
    unit_cost_target = base_cost / target_eff if target_eff > 0 else 0.0
    target_price_unit = unit_cost_target / (1.0 - req.target_margin_pct)
    target_rev = target_price_unit * target_eff

    is_high_complexity = req.process.complexity in ("alta", "soat_adres_baja", "soat_adres_alta")

    # 1. Tarifa Fija por Factura
    rev_per_inv = target_rev
    # 2. Suscripción Mensual por Rango (prima de estabilidad +8% sobre costo base)
    rev_tier = target_rev * 1.05
    # 3. Modelo Híbrido (60% fijo base + variable por factura con +10% margen en excedente)
    rev_hybrid = base_cost * 0.75 + (target_rev * 0.52)
    # 4. Porcentaje sobre valor facturado / recaudo
    rev_success = target_eff * req.avg_invoice_value * req.success_fee_pct

    raw_options = [
        {
            "model_id": "per_invoice",
            "model_name": "Tarifa Fija por Factura (Transaccional)",
            "rev": rev_per_inv,
            "base_acceptance": 88 if not is_high_complexity else 74,
            "pros": "Transparente para el cliente y proporcional al volumen real.",
            "cons": "Riesgo de margen si llegan cuentas de complejidad atípica sin tarifa diferenciada.",
        },
        {
            "model_id": "tiered_retainer",
            "model_name": "Suscripción Mensual por Rango (Paquete)",
            "rev": rev_tier,
            "base_acceptance": 84 if target_eff >= 3000 else 79,
            "pros": "Ingreso predecible y presupuesto fijo para la IPS/EPS dentro del rango.",
            "cons": "Requiere cláusula clara de salto de rango al superar el tope de facturas.",
        },
        {
            "model_id": "hybrid",
            "model_name": "Híbrido (Base Fija + Variable por Factura)",
            "rev": rev_hybrid,
            "base_acceptance": 90,
            "pros": "Asegura cobertura de costos fijos/RPA y escala margen con el volumen.",
            "cons": "Requiere explicar dos componentes en la propuesta comercial.",
        },
        {
            "model_id": "success_fee",
            "model_name": "% sobre Valor Facturado / Recuperado",
            "rev": rev_success,
            "base_acceptance": 92 if is_high_complexity else 70,
            "pros": "Máxima aceptación y potencial de ingreso en cuentas de alto valor o SOAT-ADRES.",
            "cons": "Flujo de caja sujeto al ciclo de recaudo/auditoría del pagador.",
        },
    ]

    scored: list[MonetizationOption] = []
    best_id = ""
    best_combined = -1.0

    w_prof = req.profitability_weight
    w_acc = 1.0 - w_prof

    for opt in raw_options:
        rev = float(opt["rev"])
        margin_amt = rev - base_cost
        margin_pct = (margin_amt / rev) if rev > 0 else 0.0
        prof_score = max(10, min(100, int(round(margin_pct * 200))))

        # Aceptación dinámica: penaliza si el cobro unitario excede 2.5x el precio objetivo o >5% del valor factura
        unit_price_opt = rev / target_eff if target_eff > 0 else 0.0
        price_ratio = unit_price_opt / target_price_unit if target_price_unit > 0 else 1.0
        ticket_share = unit_price_opt / req.avg_invoice_value if req.avg_invoice_value > 0 else 0.0
        acc_penalty = 0
        if price_ratio > 2.5:
            acc_penalty += min(25, int(round((price_ratio - 2.5) * 4)))
        if ticket_share > 0.05:
            acc_penalty += min(15, int(round((ticket_share - 0.05) * 200)))
        acc_score = max(20, min(98, int(opt["base_acceptance"]) - acc_penalty))

        penalty = 20.0 if acc_score < req.min_acceptance_threshold else 0.0
        combined = w_prof * prof_score + w_acc * acc_score - penalty
        if combined > best_combined:
            best_combined = combined
            best_id = str(opt["model_id"])

        scored.append(
            MonetizationOption(
                model_id=str(opt["model_id"]),
                model_name=str(opt["model_name"]),
                estimated_monthly_revenue=round(rev, 2),
                estimated_monthly_cost=round(base_cost, 2),
                gross_margin_amount=round(margin_amt, 2),
                gross_margin_pct=round(margin_pct, 4),
                market_acceptance_score=acc_score,
                profitability_score=prof_score,
                pros=str(opt["pros"]),
                cons=str(opt["cons"]),
                is_recommended=False,
            )
        )

    rec_name = ""
    for s in scored:
        if s.model_id == best_id:
            s.is_recommended = True
            rec_name = s.model_name

    summary = (
        f"Para {req.process.expected_monthly_demand:,.0f} facturas/mes ({req.process.complexity}), "
        f"la operación óptima requiere {target_mix.optimal_humans} humano(s) y {target_mix.optimal_bots} bot(s) "
        f"con un costo unitario de ${unit_cost_target:,.0f}/factura. El modelo recomendado es '{rec_name}'."
    )

    return PricingSimulationResult(
        process_name=req.process.name,
        complexity=req.process.complexity,
        tiers=tier_results,
        monetization_options=scored,
        recommended_monetization=rec_name,
        executive_summary=summary,
    )
