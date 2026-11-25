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
