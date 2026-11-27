from fastapi import APIRouter
from app.engine.pricing import simulate_pricing_and_tiers
from app.schemas.pricing import PricingSimulationRequest, PricingSimulationResult

router = APIRouter(tags=["pricing"])


@router.post("/simulate/pricing", response_model=PricingSimulationResult)
def simulate_pricing(req: PricingSimulationRequest) -> PricingSimulationResult:
    return simulate_pricing_and_tiers(req)
