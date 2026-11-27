from app.engine.pricing import simulate_pricing_and_tiers
from app.schemas.pricing import PricingSimulationRequest
from app.schemas.process import ProcessConfig
from app.schemas.resource import ResourceProfile


def test_pricing_tiers_and_monetization():
    proc = ProcessConfig(
        name="Radicación Digital",
        category="radicacion",
        complexity="baja",
        expected_monthly_demand=9000,
        avg_time_minutes=3,
    )
    human = ResourceProfile(
        resource_type="human",
        available_hours_per_day=8,
        available_days_per_month=22,
        inefficiency_rate=0.10,
        monthly_cost=2_500_000.0,
    )
    bot = ResourceProfile(
        resource_type="bot",
        available_hours_per_day=12,
        available_days_per_month=30,
        speed_multiplier=1.5,
        inefficiency_rate=0.03,
        exception_escalation_rate=0.15,
        monthly_cost=1_800_000.0,
    )
    res = simulate_pricing_and_tiers(
        PricingSimulationRequest(process=proc, human_profile=human, bot_profile=bot)
    )
    assert len(res.tiers) >= 5
    assert len(res.monetization_options) == 4
    assert any(opt.is_recommended for opt in res.monetization_options)
