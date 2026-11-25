from typing import Literal
from pydantic import BaseModel, Field

ProcessCategory = Literal["liquidacion", "armado_cuentas", "auditoria", "radicacion", "devoluciones"]
ComplexityLevel = Literal["baja", "media", "alta", "soat_adres_baja", "soat_adres_alta"]


class ProcessConfig(BaseModel):
    """Parámetros operacionales de un proceso de facturación en salud."""

    id: str = Field(default="proc-1")
    name: str = Field(min_length=1)
    category: ProcessCategory
    complexity: ComplexityLevel = "media"
    expected_monthly_demand: float = Field(gt=0, description="Facturas o cuentas esperadas al mes")
    avg_time_minutes: float = Field(gt=0, description="Tiempo estándar por factura en minutos")
    working_days_per_month: int = Field(ge=1, le=31, default=22)
    effective_hours_per_day: float = Field(gt=0, le=24, default=8.0)
    base_inefficiency_rate: float = Field(ge=0.0, lt=1.0, default=0.10)
    rework_return_rate: float = Field(
        ge=0.0,
        lt=0.9,
        default=0.0,
        description="Fracción de facturas devueltas/glosadas que reingresan al flujo",
    )
    sla_deadline_days: int | None = Field(
        default=None,
        ge=1,
        le=31,
        description="Ventana máxima de días hábiles para completar el lote (ej. cierre mensual)",
    )
