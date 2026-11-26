from app.engine.optimizer import optimize_human_bot_mix
from app.engine.pipeline import analyze_pipeline
from app.schemas.process import ProcessConfig
from app.schemas.resource import ResourceProfile
from app.schemas.simulation import MixOptimizeRequest, PipelineRequest, PipelineStageInput


def test_mix_optimizer_selects_bots_and_humans_for_exceptions():
    proc = ProcessConfig(
        name="Radicación Digital",
        category="radicacion",
        complexity="baja",
        expected_monthly_demand=15000.0,
        avg_time_minutes=3.0,
        working_days_per_month=22,
        effective_hours_per_day=8.0,
    )
    human = ResourceProfile(
        resource_type="human",
        available_hours_per_day=8.0,
        available_days_per_month=22,
        inefficiency_rate=0.10,
        monthly_cost=2_500_000.0,
    )
    bot = ResourceProfile(
        resource_type="bot",
        available_hours_per_day=12.0,
        available_days_per_month=30,
        speed_multiplier=1.5,
        inefficiency_rate=0.03,
        exception_escalation_rate=0.15,
        monthly_cost=1_800_000.0,
    )
    res = optimize_human_bot_mix(
        MixOptimizeRequest(process=proc, human_profile=human, bot_profile=bot)
    )
    assert res.feasible is True
    assert res.optimal_bots >= 1
    assert res.optimal_humans >= 1
    assert res.escalated_demand_to_humans > 0


def test_pipeline_identifies_bottleneck():
    p1 = ProcessConfig(name="Liquidación", category="liquidacion", expected_monthly_demand=5000, avg_time_minutes=6)
    p2 = ProcessConfig(name="Auditoría", category="auditoria", expected_monthly_demand=5000, avg_time_minutes=15)
    p3 = ProcessConfig(name="Radicación", category="radicacion", expected_monthly_demand=5000, avg_time_minutes=3)
    res_std = ResourceProfile(available_hours_per_day=8, available_days_per_month=22, inefficiency_rate=0.1)

    result = analyze_pipeline(
        PipelineRequest(
            stages=[
                PipelineStageInput(process=p1, resource=res_std, assigned_count=4),
                PipelineStageInput(process=p2, resource=res_std, assigned_count=4),
                PipelineStageInput(process=p3, resource=res_std, assigned_count=3),
            ]
        )
    )
    assert result.bottleneck_stage == "Auditoría"
    assert any(s.is_bottleneck and s.process_name == "Auditoría" for s in result.stages)


def test_pipeline_audit_sampling_and_shared_bot_pool():
    # Bot: 12h * 30d = 360h = 21,600 min/mes; con speed 1.0 e ineff 0 -> 21,600 min/mes.
    # Armado 6 min + Radicación 3 min = 9 min/factura -> 1 bot compartido hace 2,400 fact/mes exactas.
    armado = ProcessConfig(name="2. Armado", category="armado_cuentas", expected_monthly_demand=2400, avg_time_minutes=6, rework_return_rate=0.0)
    auditoria = ProcessConfig(name="3. Auditoría", category="auditoria", expected_monthly_demand=2400, avg_time_minutes=15, rework_return_rate=0.0)
    radicacion = ProcessConfig(name="4. Radicación", category="radicacion", expected_monthly_demand=2400, avg_time_minutes=3, rework_return_rate=0.0)

    bot = ResourceProfile(resource_type="bot", available_hours_per_day=12, available_days_per_month=30, speed_multiplier=1.0, inefficiency_rate=0.0)
    human = ResourceProfile(resource_type="human", available_hours_per_day=8, available_days_per_month=22, inefficiency_rate=0.1)

    result = analyze_pipeline(
        PipelineRequest(
            stages=[
                PipelineStageInput(process=armado, resource=bot, assigned_count=1, shared_pool="bot-rpa"),
                PipelineStageInput(process=auditoria, resource=human, assigned_count=1, pass_through_rate=0.10),
                PipelineStageInput(process=radicacion, resource=bot, assigned_count=1, shared_pool="bot-rpa"),
            ]
        )
    )
    aud_res = next(s for s in result.stages if s.process_name == "3. Auditoría")
    arm_res = next(s for s in result.stages if s.process_name == "2. Armado")
    assert aud_res.incoming_demand == 240.0
    assert aud_res.utilization_rate < 0.5
    assert arm_res.pool_utilization_rate == 1.0
    assert result.max_end_to_end_monthly_throughput == 2400.0


def test_pipeline_mixed_human_and_bot_stage():
    armado = ProcessConfig(name="2. Armado Mixto", category="armado_cuentas", expected_monthly_demand=10000, avg_time_minutes=8, rework_return_rate=0.0)
    human = ResourceProfile(resource_type="human", available_hours_per_day=8, available_days_per_month=22, inefficiency_rate=0.1)
    bot = ResourceProfile(
        resource_type="bot",
        available_hours_per_day=12,
        available_days_per_month=30,
        speed_multiplier=1.5,
        inefficiency_rate=0.03,
        exception_escalation_rate=0.15,
    )
    res = analyze_pipeline(
        PipelineRequest(
            stages=[
                PipelineStageInput(
                    process=armado,
                    resource=human,
                    assigned_count=2,
                    bot_resource=bot,
                    assigned_bots=2,
                    bot_avg_time_minutes=4.0,
                )
            ]
        )
    )
    st = res.stages[0]
    assert st.bot_utilization_rate is not None
    assert st.human_utilization_rate is not None
    assert st.utilization_rate == max(st.bot_utilization_rate, st.human_utilization_rate)
    assert st.safe_recommended_count >= st.recommended_count
