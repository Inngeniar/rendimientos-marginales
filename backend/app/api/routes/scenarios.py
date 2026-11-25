import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ScenarioRecord

router = APIRouter(tags=["scenarios"])


class ScenarioCreate(BaseModel):
    name: str
    category: str
    payload: dict
    result: dict


class ScenarioOut(BaseModel):
    id: int
    name: str
    category: str
    payload: dict
    result: dict
    created_at: str


@router.get("/scenarios", response_model=list[ScenarioOut])
def list_scenarios(db: Session = Depends(get_db)) -> list[ScenarioOut]:
    rows = db.query(ScenarioRecord).order_by(ScenarioRecord.id.desc()).all()
    return [
        ScenarioOut(
            id=r.id,
            name=r.name,
            category=r.category,
            payload=json.loads(r.payload_json),
            result=json.loads(r.result_json),
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/scenarios", response_model=ScenarioOut)
def create_scenario(body: ScenarioCreate, db: Session = Depends(get_db)) -> ScenarioOut:
    rec = ScenarioRecord(
        name=body.name,
        category=body.category,
        payload_json=json.dumps(body.payload),
        result_json=json.dumps(body.result),
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return ScenarioOut(
        id=rec.id,
        name=rec.name,
        category=rec.category,
        payload=body.payload,
        result=body.result,
        created_at=rec.created_at.isoformat(),
    )


@router.delete("/scenarios/{scenario_id}")
def delete_scenario(scenario_id: int, db: Session = Depends(get_db)) -> dict[str, bool]:
    rec = db.query(ScenarioRecord).filter(ScenarioRecord.id == scenario_id).first()
    if rec is None:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")
    db.delete(rec)
    db.commit()
    return {"deleted": True}
