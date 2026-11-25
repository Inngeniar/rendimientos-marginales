from fastapi import APIRouter
from app.engine.baseline import compute_baseline
from app.engine.marginal import compute_marginal_analysis
from app.engine.optimizer import optimize_human_bot_mix
from app.engine.pipeline import analyze_pipeline
from app.schemas.simulation import (
    BaselineRequest,
    BaselineResult,
    MarginalRequest,
    MarginalResult,
    MixOptimizeRequest,
    MixOptimizeResult,
    PipelineRequest,
    PipelineResult,
)

router = APIRouter(tags=["simulation"])


@router.post("/simulate/baseline", response_model=BaselineResult)
def simulate_baseline(req: BaselineRequest) -> BaselineResult:
    return compute_baseline(req.process, req.resource)


@router.post("/simulate/marginal", response_model=MarginalResult)
def simulate_marginal(req: MarginalRequest) -> MarginalResult:
    return compute_marginal_analysis(
        req.process, req.resource, max_staff=req.max_staff, congestion_alpha=req.congestion_alpha
    )


@router.post("/optimize/mix", response_model=MixOptimizeResult)
def optimize_mix(req: MixOptimizeRequest) -> MixOptimizeResult:
    return optimize_human_bot_mix(req)


@router.post("/simulate/pipeline", response_model=PipelineResult)
def simulate_pipeline(req: PipelineRequest) -> PipelineResult:
    return analyze_pipeline(req)
