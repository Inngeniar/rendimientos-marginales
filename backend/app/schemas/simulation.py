from pydantic import BaseModel, Field
from app.schemas.process import ProcessConfig
from app.schemas.resource import ResourceProfile


class BaselineRequest(BaseModel):
    process: ProcessConfig
    resource: ResourceProfile | None = None


class BaselineResult(BaseModel):
    process_name: str
    effective_demand: float
    raw_daily_capacity_per_resource: float
    raw_hourly_capacity_per_resource: float
    monthly_capacity_per_resource: float
    net_monthly_capacity_per_resource: float
    optimal_daily_production: float
    optimal_hourly_production: float
    required_resources_exact: float
    required_resources_rounded: int
    current_headcount: int
    headcount_gap: int
    utilization_rate: float
    benchmark_status: str


class MarginalPoint(BaseModel):
    staff_count: int
    total_output: float
    average_output: float
    marginal_output: float
    utilization_rate: float
    unit_cost: float


class MarginalRequest(BaseModel):
    process: ProcessConfig
    resource: ResourceProfile
    max_staff: int = Field(ge=2, le=100, default=15)
    congestion_alpha: float = Field(
        ge=0.0,
        le=0.5,
        default=0.03,
        description="Pérdida marginal por congestión de sistemas/coordinación por cada recurso adicional",
    )


class MarginalResult(BaseModel):
    process_name: str
    optimal_staff_for_demand: int
    max_marginal_efficiency_staff: int
    optimal_daily_production: float
    optimal_hourly_production: float
    curve: list[MarginalPoint]
    bottleneck_alert: str | None = None


class MixOptimizeRequest(BaseModel):
    process: ProcessConfig
    human_profile: ResourceProfile
    bot_profile: ResourceProfile
    max_humans: int = Field(ge=0, le=500, default=500)
    max_bots: int = Field(ge=0, le=100, default=50)
    objective: str = Field(default="min_cost", pattern="^(min_cost|max_throughput)$")


class MixOptimizeResult(BaseModel):
    feasible: bool
    optimal_humans: int
    optimal_bots: int
    total_monthly_cost: float
    total_monthly_capacity: float
    escalated_demand_to_humans: float
    bot_handled_demand: float
    optimal_daily_production: float
    optimal_hourly_production: float
    cost_per_invoice: float
    notes: str


class PipelineStageInput(BaseModel):
    process: ProcessConfig
    resource: ResourceProfile
    assigned_count: int = Field(ge=1, default=1)


class PipelineRequest(BaseModel):
    stages: list[PipelineStageInput] = Field(min_length=1)


class PipelineStageResult(BaseModel):
    process_name: str
    category: str
    incoming_demand: float
    effective_demand_with_rework: float
    stage_monthly_capacity: float
    utilization_rate: float
    is_bottleneck: bool
    recommended_count: int


class PipelineResult(BaseModel):
    stages: list[PipelineStageResult]
    bottleneck_stage: str
    max_end_to_end_monthly_throughput: float
