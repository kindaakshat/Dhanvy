from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ProductItem(BaseModel):
    id: str
    name: str
    merchant: str
    category: str
    price_inr: float
    rating: float = 4.5
    description: str = ""
    in_stock: bool = True

class UserIntent(BaseModel):
    merchant: str = "Amazon"
    category: str = "Electronics"
    product: str
    max_amount_inr: float
    currency: str = "INR"

class PurchaseAction(BaseModel):
    agent: str = "ShoppingAgent-01"
    merchant: str
    category: str
    product: str
    amount_inr: float
    amount_paise: int
    currency: str = "INR"
    user_intent: str
    idempotency_key: str
    attempted_capability: Optional[str] = "PURCHASE_ELECTRONICS"

class CheckItem(BaseModel):
    name: str
    status: str  # PASSED, FAILED, WARNING
    details: str

class AuthorizationResult(BaseModel):
    decision: str  # APPROVED, BLOCKED, REVIEW
    structured_decision: str  # ALLOW, BLOCK, REQUIRES_HUMAN_APPROVAL
    reason: str
    status: str
    risk_score: int
    decision_reasons: List[str] = []
    checks: List[Dict[str, Any]] = []
    razorpay_order_id: Optional[str] = None
    razorpay_status: Optional[str] = None
    duplicate_payment_prevented: bool = False

class LifecycleTrace(BaseModel):
    lifecycle: str = "USER -> AGENT -> LEO -> RAZORPAY"
    user_said: str
    ai_understood: Dict[str, Any]
    agent_decided: Dict[str, Any]
    agent_requested: Dict[str, Any]
    leo_verified: Dict[str, Any]
    payment_rail: Dict[str, Any]
    audit_trail: List[Dict[str, Any]] = []
    timestamp: str

class AgentRunRequest(BaseModel):
    prompt: str = "Buy me a Logitech keyboard from Amazon for less than ₹5,000."
    scenario: Optional[str] = "LEGITIMATE"  # LEGITIMATE, AMOUNT_OVERRIDE, MERCHANT_SWITCH, INTENT_DRIFT, PROMPT_INJECTION, DUPLICATE, CAPABILITY_ESCALATION
    force_idempotency_key: Optional[str] = None
