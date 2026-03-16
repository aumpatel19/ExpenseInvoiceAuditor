from typing import List
from fastapi import APIRouter, HTTPException
from datetime import datetime

from schemas.policy import PolicyRule, PolicyRuleCreate
from db.mongo import policy_rules_col

router = APIRouter()


@router.get("/policies", response_model=List[PolicyRule])
async def list_policies():
    cursor = policy_rules_col().find({}, {"_id": 0})
    rules = await cursor.to_list(length=100)
    return [PolicyRule(**r) for r in rules]


@router.post("/policies", response_model=PolicyRule)
async def create_policy(body: PolicyRuleCreate):
    rule = PolicyRule(**body.model_dump())
    await policy_rules_col().insert_one(rule.model_dump(mode="json"))
    return rule


@router.patch("/policies/{rule_id}", response_model=PolicyRule)
async def update_policy(rule_id: str, body: PolicyRuleCreate):
    existing = await policy_rules_col().find_one({"rule_id": rule_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Policy rule not found.")

    update_data = body.model_dump()
    update_data["updated_at"] = datetime.utcnow()
    await policy_rules_col().update_one({"rule_id": rule_id}, {"$set": update_data})
    updated = await policy_rules_col().find_one({"rule_id": rule_id}, {"_id": 0})
    return PolicyRule(**updated)


@router.delete("/policies/{rule_id}")
async def delete_policy(rule_id: str):
    result = await policy_rules_col().delete_one({"rule_id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Policy rule not found.")
    return {"message": "Policy rule deleted.", "rule_id": rule_id}
