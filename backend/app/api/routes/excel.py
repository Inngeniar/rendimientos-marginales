from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from app.schemas.process import ProcessConfig
from app.services.excel_io import export_baseline_to_excel, parse_excel_processes

router = APIRouter(tags=["excel"])


@router.post("/excel/import", response_model=list[ProcessConfig])
async def import_excel(file: UploadFile = File(...)) -> list[ProcessConfig]:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Solo se admiten archivos .xlsx")
    content = await file.read()
    return parse_excel_processes(content)


@router.post("/excel/export")
def export_excel(rows: list[dict]) -> Response:
    content = export_baseline_to_excel(rows)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="rendimientos_marginales.xlsx"'},
    )
