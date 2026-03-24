from typing import List
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from auth import get_current_user
from schemas.policy import PolicyRule, PolicyRuleCreate
from db.mongo import policy_rules_col

router = APIRouter()


@router.get("/policies", response_model=List[PolicyRule])
async def list_policies(current_user: dict = Depends(get_current_user)):
    cursor = policy_rules_col().find({"username": current_user["username"]}, {"_id": 0})
    rules = await cursor.to_list(length=100)
    return [PolicyRule(**r) for r in rules]


@router.post("/policies", response_model=PolicyRule)
async def create_policy(body: PolicyRuleCreate, current_user: dict = Depends(get_current_user)):
    rule = PolicyRule(**body.model_dump())
    rule_dict = rule.model_dump(mode="json")
    rule_dict["username"] = current_user["username"]
    await policy_rules_col().insert_one(rule_dict)
    return rule


@router.patch("/policies/{rule_id}", response_model=PolicyRule)
async def update_policy(rule_id: str, body: PolicyRuleCreate, current_user: dict = Depends(get_current_user)):
    existing = await policy_rules_col().find_one({"rule_id": rule_id, "username": current_user["username"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Policy rule not found.")

    update_data = body.model_dump()
    update_data["updated_at"] = datetime.utcnow()
    await policy_rules_col().update_one({"rule_id": rule_id}, {"$set": update_data})
    updated = await policy_rules_col().find_one({"rule_id": rule_id}, {"_id": 0})
    return PolicyRule(**updated)


@router.delete("/policies/{rule_id}")
async def delete_policy(rule_id: str, current_user: dict = Depends(get_current_user)):
    result = await policy_rules_col().delete_one({"rule_id": rule_id, "username": current_user["username"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Policy rule not found.")
    return {"message": "Policy rule deleted.", "rule_id": rule_id}
