from pydantic import BaseModel, Field
from app.schemas.process import ProcessConfig
from app.schemas.resource import ResourceProfile


class PricingSimulationRequest(BaseModel):
    process: ProcessConfig
    human_profile: ResourceProfile
    bot_profile: ResourceProfile
    target_margin_pct: float = Field(ge=0.05, le=0.80, default=0.30)
    avg_invoice_value: float = Field(gt=0, default=350_000.0, description="Valor promedio facturado por cuenta ($)")
    success_fee_pct: float = Field(ge=0.002, le=0.25, default=0.025, description="% sobre valor facturado/recuperado")
    volume_tiers: list[int] | None = Field(
        default=None,
        description="Lista opcional de volúmenes mensuales a evaluar",
    )


class VolumeTierResult(BaseModel):
    tier_label: str
    min_volume: int
    max_volume: int
    optimal_humans: int
    optimal_bots: int
    solo_humans_needed: int
    monthly_operational_cost: float
    unit_cost_per_invoice: float
    recommended_unit_price: float
    recommended_monthly_price: float
    resource_jump_note: str


class MonetizationOption(BaseModel):
    model_id: str
    model_name: str
    estimated_monthly_revenue: float
    estimated_monthly_cost: float
    gross_margin_amount: float
    gross_margin_pct: float
    market_acceptance_score: int
    profitability_score: int
    pros: str
    cons: str
    is_recommended: bool


class PricingSimulationResult(BaseModel):
    process_name: str
    complexity: str
    tiers: list[VolumeTierResult]
    monetization_options: list[MonetizationOption]
    recommended_monetization: str
    executive_summary: str
