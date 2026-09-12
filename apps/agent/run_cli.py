"""
Standalone CLI runner for ShoppingAgent-01 (Google ADK).
Allows direct execution from shell or parent processes (e.g. Node.js backend)
without requiring a long-running uvicorn daemon.
"""

import sys
import json
import argparse
from agent import ShoppingAgent

def main():
    parser = argparse.ArgumentParser(description="Run Google ADK ShoppingAgent-01")
    parser.add_argument("--prompt", type=str, default="Buy me a Logitech keyboard from Amazon for less than ₹5,000.", help="User natural language shopping request")
    parser.add_argument("--scenario", type=str, default="LEGITIMATE", help="Demo or attack scenario preset")
    parser.add_argument("--idempotency-key", type=str, default=None, help="Force specific idempotency key")
    
    args = parser.parse_args()
    
    agent = ShoppingAgent()
    trace = agent.run(
        prompt=args.prompt,
        scenario=args.scenario,
        force_idempotency_key=args.idempotency_key,
    )
    
    # Output trace as JSON for consumption
    print(json.dumps(trace.model_dump()))

if __name__ == "__main__":
    main()
