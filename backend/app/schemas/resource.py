from typing import Literal
from pydantic import BaseModel, Field

ResourceType = Literal["human", "bot"]


class ResourceProfile(BaseModel):
    """Perfil de capacidad, eficiencia y costo de un operador humano o bot RPA."""

    resource_type: ResourceType = "human"
    name: str = Field(default="Operador Estándar")
    available_hours_per_day: float = Field(gt=0, le=24, default=8.0)
    available_days_per_month: int = Field(ge=1, le=31, default=22)
    speed_multiplier: float = Field(
        gt=0.1,
        default=1.0,
        description="Multiplicador de velocidad respecto al tiempo estándar (>1 más rápido)",
    )
    inefficiency_rate: float = Field(ge=0.0, lt=1.0, default=0.10)
    exception_escalation_rate: float = Field(
        ge=0.0,
        lt=1.0,
        default=0.0,
        description="Fracción de casos que el bot no resuelve y escala a humano",
    )
    fatigue_exponent: float = Field(
        ge=0.0,
        le=2.0,
        default=0.15,
        description="Penalización marginal por congestión/fatiga al escalar dotación u horas",
    )
    learning_curve_factor: float = Field(
        gt=0.1,
        le=1.0,
        default=1.0,
        description="Factor de experiencia (0.6 nuevo, 1.0 senior)",
    )
    monthly_cost: float = Field(ge=0.0, default=2_500_000.0, description="Costo mensual unitario")
    current_headcount: int = Field(ge=0, default=0)
