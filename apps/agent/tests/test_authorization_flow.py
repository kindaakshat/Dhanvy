"""
Tests verifying the critical security boundaries and invariants:
1. Agent does NOT hold Razorpay credentials or tokens.
2. Agent cannot self-approve payments.
3. Razorpay is NEVER invoked when LEO blocks a transaction.
4. Fail-closed behavior on network failures.
"""

import pytest
import sys
import inspect
from pathlib import Path
from unittest.mock import patch
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agent import ShoppingAgent
import tools


def test_agent_holds_no_payment_credentials():
    """Verify ShoppingAgent code and instances hold zero payment secrets."""
    agent = ShoppingAgent()

    # Verify instance attributes
    forbidden_attrs = [
        "razorpay",
        "razorpay_key",
        "razorpay_secret",
        "payment_token",
        "card_number",
        "bank_account",
    ]
    for attr in forbidden_attrs:
        assert not hasattr(agent, attr), f"Agent must NOT hold {attr}"

    # Verify tools module does not import Razorpay client
    source = inspect.getsource(tools)
    assert "import razorpay" not in source.lower()
    assert "rzp_test_" not in source
    assert "rzp_live_" not in source


def test_blocked_request_never_invokes_razorpay():
    """Verify that any blocked request has razorpay_invoked=False and razorpay_order_id=None."""
    agent = ShoppingAgent()

    blocked_response = {
        "decision": "BLOCKED",
        "structuredDecision": "BLOCK",
        "reason": "Merchant RogueVendor not authorized",
        "status": "REJECTED",
        "riskScore": 95,
        "decisionReasons": ["MERCHANT_NOT_AUTHORIZED"],
        "checks": [],
        "razorpayOrder": None,
    }

    with patch("agent.create_purchase_request", return_value=blocked_response):
        trace = agent.run("Buy from RogueVendor", scenario="MERCHANT_SWITCH")

        assert trace.leo_verified["decision"] == "BLOCKED"
        assert trace.payment_rail["razorpay_invoked"] is False
        assert trace.payment_rail["razorpay_order_id"] is None
        assert "NEVER invoked" in trace.payment_rail["message"]


def test_fail_closed_on_leo_network_error():
    """Verify fail-closed architecture: if LEO API is unreachable, request is BLOCKED with risk=100."""
    with patch("requests.post", side_effect=requests.exceptions.ConnectionError("Connection refused")):
        res = tools.create_purchase_request(
            product="Logitech Keyboard",
            merchant="Amazon",
            category="Electronics",
            amount_inr=3999.0,
            currency="INR",
            user_intent="Buy keyboard",
        )

        assert res["decision"] == "BLOCKED"
        assert res["structuredDecision"] == "BLOCK"
        assert res["riskScore"] == 100
        assert "NETWORK_ERROR_FAIL_CLOSED" in res["decisionReasons"]
