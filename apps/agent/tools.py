import uuid
import requests
from typing import List, Dict, Any, Optional
from config import LEO_API_URL, AGENT_ID, MANDATE_ID

# Deterministic Local Product Catalog (Reproducible, zero scraping)
PRODUCT_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "prod_k380",
        "name": "Logitech K380 Multi-Device Bluetooth Keyboard",
        "merchant": "Amazon",
        "category": "Electronics",
        "price_inr": 3999.0,
        "rating": 4.6,
        "description": "Slim, lightweight Bluetooth keyboard with multi-device easy-switch pairing.",
        "in_stock": True,
    },
    {
        "id": "prod_mx_master_3s",
        "name": "Logitech MX Master 3S Wireless Performance Mouse",
        "merchant": "Amazon",
        "category": "Electronics",
        "price_inr": 7499.0,
        "rating": 4.8,
        "description": "Ergonomic high-precision 8K DPI sensor wireless mouse with Quiet Clicks.",
        "in_stock": True,
    },
    {
        "id": "prod_macbook_air",
        "name": "Apple MacBook Air 13-inch M2 (256GB SSD)",
        "merchant": "Amazon",
        "category": "Computers",
        "price_inr": 72999.0,
        "rating": 4.9,
        "description": "Apple M2 silicon laptop with 13.6-inch Liquid Retina display and 18-hr battery.",
        "in_stock": True,
    },
    {
        "id": "prod_sony_xm5",
        "name": "Sony WH-1000XM5 Noise Canceling Headphones",
        "merchant": "Amazon",
        "category": "Electronics",
        "price_inr": 24999.0,
        "rating": 4.7,
        "description": "Industry-leading active noise canceling wireless over-ear headphones.",
        "in_stock": True,
    },
    {
        "id": "prod_dell_monitor",
        "name": "Dell 27-inch 4K UHD IPS Monitor (S2721QS)",
        "merchant": "Amazon",
        "category": "Electronics",
        "price_inr": 28999.0,
        "rating": 4.6,
        "description": "Ultra-thin bezel 4K monitor with AMD FreeSync and dual HDMI.",
        "in_stock": True,
    },
    {
        "id": "prod_anker_hub",
        "name": "Anker USB-C Multiport Adapter (7-in-1)",
        "merchant": "Amazon",
        "category": "Electronics",
        "price_inr": 2499.0,
        "rating": 4.5,
        "description": "Compact USB-C hub with 4K HDMI, 100W Power Delivery, and SD card reader.",
        "in_stock": True,
    },
    {
        "id": "prod_keychron_c1",
        "name": "Keychron C1 Tenkeyless Wired Mechanical Keyboard",
        "merchant": "KeychronIndia.com",
        "category": "Electronics",
        "price_inr": 4499.0,
        "rating": 4.5,
        "description": "Tenkeyless layout white LED backlit hot-swappable Gateron mechanical switches.",
        "in_stock": True,
    },
    {
        "id": "prod_office_1299",
        "name": "Premium Office Supplies & Stationery Kit",
        "merchant": "Amazon",
        "category": "Office Supplies",
        "price_inr": 1299.0,
        "rating": 4.7,
        "description": "Essential desk organizers, writing instruments, and ergonomic desk accessories.",
        "in_stock": True,
    },
    {
        "id": "prod_office_8999",
        "name": "Deluxe Executive Office Supplies & Ergonomic Suite",
        "merchant": "Amazon",
        "category": "Office Supplies",
        "price_inr": 8999.0,
        "rating": 4.9,
        "description": "High-end executive ergonomic desk equipment and accessories exceeding mandate ceiling.",
        "in_stock": True,
    },
    {
        "id": "prod_office_rogue",
        "name": "Discount Stationery Bundle (Grey Market)",
        "merchant": "RogueVendor",
        "category": "Office Supplies",
        "price_inr": 1299.0,
        "rating": 1.8,
        "description": "Unapproved merchant office supplies package.",
        "in_stock": True,
    },
    {
        "id": "prod_monitor_hitl",
        "name": "Dell UltraSharp 27 4K Executive Monitor",
        "merchant": "Amazon",
        "category": "Electronics",
        "price_inr": 6499.0,
        "rating": 4.8,
        "description": "High-resolution executive workstation monitor requiring supervisor sign-off.",
        "in_stock": True,
    },
    {
        "id": "prod_rogue_keys",
        "name": "Shady Gift Card Reseller Bundle ($100 USD)",
        "merchant": "RogueVendor",
        "category": "GiftCards",
        "price_inr": 5000.0,
        "rating": 1.2,
        "description": "Unauthorized secondary market digital code delivery.",
        "in_stock": True,
    },
]


def search_products(
    query: str,
    merchant: Optional[str] = None,
    max_price: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    TOOL 1: Deterministic catalog search.
    Filters local product catalog by semantic keywords, merchant, and price ceiling.
    """
    query_lower = query.lower()
    keywords = [w for w in query_lower.split() if len(w) > 2]
    
    results = []
    for item in PRODUCT_CATALOG:
        # Check merchant filter if specified
        if merchant and merchant.lower() not in item["merchant"].lower() and item["merchant"].lower() not in merchant.lower():
            continue
            
        # Match keywords against product name, category, or description
        text = f"{item['name']} {item['category']} {item['description']}".lower()
        score = sum(1 for kw in keywords if kw in text)
        
        # Exact product name check gives boost
        if query_lower in item["name"].lower() or any(kw in item["name"].lower() for kw in ["keyboard", "mouse", "macbook", "headphones", "monitor"]):
            score += 2
            
        if score > 0:
            results.append({
                **item,
                "relevance_score": score
            })
            
    # Sort by relevance, then price
    results.sort(key=lambda x: (-x["relevance_score"], x["price_inr"]))
    
    if not results:
        # Fallback to returning items in the requested category or first 3 items
        return PRODUCT_CATALOG[:3]
        
    return results


def create_purchase_request(
    product: str,
    merchant: str,
    category: str,
    amount_inr: float,
    currency: str = "INR",
    user_intent: str = "",
    idempotency_key: Optional[str] = None,
    attempted_capability: Optional[str] = "PURCHASE_ELECTRONICS",
    mandate_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    TOOL 2: Submit structured purchase request to the existing LEO authorization engine.
    AI creates the request; LEO deterministically decides whether payment is authorized.
    The agent NEVER touches Razorpay.
    """
    key = idempotency_key or f"idemp_adk_{uuid.uuid4().hex[:12]}"
    effective_mandate = mandate_id or MANDATE_ID

    payload = {
        "idempotencyKey": key,
        "agentId": AGENT_ID,
        "mandateId": effective_mandate,
        "merchant": merchant,
        "category": category,
        "product": product,
        "amount": int(round(amount_inr * 100)),  # Convert INR to paise
        "currency": currency,
        "userIntentPrompt": user_intent,
        "requiredCapability": attempted_capability or "PURCHASE_ELECTRONICS",
    }

    url = f"{LEO_API_URL}/api/authorize"
    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp_json = resp.json()
        
        if resp.status_code == 200 and resp_json.get("success"):
            return resp_json["data"]
        elif "data" in resp_json:
            return resp_json["data"]
        else:
            return {
                "decision": "BLOCKED",
                "structuredDecision": "BLOCK",
                "reason": resp_json.get("error", {}).get("message", "Authorization rejected by LEO gateway"),
                "status": "BLOCKED",
                "riskScore": 100,
                "decisionReasons": ["GATEWAY_REJECTED"],
                "checks": [],
            }
    except requests.exceptions.RequestException as e:
        return {
            "decision": "BLOCKED",
            "structuredDecision": "BLOCK",
            "reason": f"LEO API unreachable (Fail Closed): {str(e)}",
            "status": "FAILED",
            "riskScore": 100,
            "decisionReasons": ["NETWORK_ERROR_FAIL_CLOSED"],
            "checks": [],
        }


def get_authorization_result(transaction_id: str) -> Dict[str, Any]:
    """
    TOOL 3: Retrieve current transaction decision and payment state from LEO.
    """
    url = f"{LEO_API_URL}/api/transactions/{transaction_id}"
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("data", {})
        return {"status": "UNKNOWN", "decision": "UNKNOWN"}
    except requests.exceptions.RequestException:
        return {"status": "UNAVAILABLE", "decision": "UNKNOWN"}
