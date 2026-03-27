from typing import List
from fastapi import APIRouter, HTTPException, Depends

from auth import get_current_user
from schemas.eval import EvalRun, EvalRunRequest
from services.eval.harness import run_eval
from db.mongo import evaluation_runs_col

router = APIRouter()


@router.post("/eval/run", response_model=EvalRun)
async def trigger_eval_run(
    body: EvalRunRequest = None,
    current_user: dict = Depends(get_current_user),
):
    sample_ids = body.sample_ids if body else None
    run = await run_eval(sample_ids=sample_ids)
    return run


@router.get("/eval/runs", response_model=List[EvalRun])
async def list_eval_runs(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    cursor = evaluation_runs_col().find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    runs = await cursor.to_list(length=limit)
    return [EvalRun(**r) for r in runs]


@router.get("/eval/runs/{run_id}", response_model=EvalRun)
async def get_eval_run(
    run_id: str,
    current_user: dict = Depends(get_current_user),
):
    run = await evaluation_runs_col().find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Eval run not found.")
    return EvalRun(**run)
