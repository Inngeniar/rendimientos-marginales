from fastapi import APIRouter
from app.engine.benchmarks import SECTOR_BENCHMARKS, SectorBenchmark

router = APIRouter(tags=["benchmarks"])


@router.get("/benchmarks", response_model=list[SectorBenchmark])
def list_benchmarks() -> list[SectorBenchmark]:
    return SECTOR_BENCHMARKS
