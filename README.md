# TrustLayer — The Autonomous Payment Governance Layer

> **"Razorpay moves money. TrustLayer governs whether an autonomous agent should be allowed to move it."**

[![Razorpay Test Mode](https://img.shields.io/badge/Razorpay-Test%20Mode-blue.svg)](https://razorpay.com)
[![Cryptographic Audit](https://img.shields.io/badge/Audit-SHA--256%20Chained-emerald.svg)]()
[![Deterministic Engines](https://img.shields.io/badge/Authorization-100%25%20Deterministic-indigo.svg)]()
[![Evaluation](https://img.shields.io/badge/Evaluation%20Accuracy-100%25-green.svg)]()

TrustLayer sits directly between autonomous AI agents and payment rails (such as Razorpay). It deterministically decides whether an autonomous financial transaction is authorized before any payment call is executed.

---

## 🛡️ Core Philosophy

- **AI decides what it wants to do. TrustLayer decides whether it is allowed to do it.**
- TrustLayer is **not** an AI payment app and **never** lets an LLM make final financial decisions.
- LLMs or rule-based models only extract structured intent bounds. The **deterministic authorization engine** makes the final financial decision.
- **Zero-Leakage Guarantee**: If TrustLayer blocks or flags a transaction for review, **no call is ever dispatched to Razorpay**.

---

## 📐 System Architecture

```
[ Autonomous AI Agent ]
         │ (Submits Natural Language or API Payment Request)
         ▼
[ TrustLayer Governance Gateway ]
   ├── 1. Agent Identity & Status Check (Active / Suspended)
   ├── 2. Capability Engine (Enforce immutable permissions; block privilege escalation)
   ├── 3. Intent Engine (Extracts merchant, product, and budget ceiling)
   ├── 4. Mandate Engine (Validates max amount, daily spent, merchant & validity window)
   ├── 5. Intent Drift Engine (Detects semantic & monetary divergence)
   ├── 6. Idempotency Check (Prevents replay attacks)
   ├── 7. Risk Engine (Calculates deterministic 0–100 risk score with reasons)
   ├── 8. Cryptographic Audit Logger (SHA-256 linear hash chaining)
   └── 9. Dynamic Trust Engine (Modulates score & auto-suspends rogue agents)
         │
    ┌────┴───────────────────────────┐
    │                                │
[ APPROVED ]                   [ BLOCKED / REVIEW ]
    │                                │
    ▼                                ▼
[ Razorpay Rail ]              [ Zero Rail Call ]
(Creates Test Mode Order)       (Logged to Audit Chain)
```

---

## ⚡ Key Features

### 1. 17-Step Deterministic Authorization Pipeline
Every transaction is evaluated in under 15ms across 17 deterministic checkpoints. No hallucinations, no non-deterministic edge cases.

### 2. Attack Lab (7 Real Adversarial Vectors)
Test the engine against genuine adversarial agent patterns in real time:
1. **Legitimate Purchase**: Amazon Logitech Keyboard (₹3,999 <= ₹5,000) -> `APPROVED`
2. **Amount Override**: Mechanical RGB Keyboard (₹6,499 > ₹5,000) -> `BLOCKED` (`AMOUNT_LIMIT_EXCEEDED`)
3. **Merchant Switch**: Vendor spoofing to unmandated merchant -> `BLOCKED` (`MERCHANT_NOT_AUTHORIZED`)
4. **Intent Drift**: Prompt &ldquo;Buy keyboard under ₹5k&rdquo; transformed into &ldquo;₹72k Gaming Laptop&rdquo; -> `BLOCKED` (`INTENT_DRIFT_DETECTED`)
5. **Duplicate Payment**: Replayed idempotency key -> `BLOCKED` (`DUPLICATE_TRANSACTION`)
6. **Expired Mandate**: Temporal window expired -> `BLOCKED` (`MANDATE_EXPIRED`)
7. **Capability Escalation**: Agent attempts `TRANSFER_TO_PERSON` -> `BLOCKED` (`PRIVILEGE_ESCALATION`)

### 3. Cryptographically Linked SHA-256 Audit Trail
Every authorization checkpoint, intent parse, and decision is cryptographically chained using SHA-256:
$$\text{EventHash} = \text{SHA256}(\text{Seq} + \text{PreviousHash} + \text{Timestamp} + \text{Payload})$$
Provides full tamper-evidence and verifiable linear history across all agent actions without external blockchain overhead.

### 4. Dynamic Agent Trust Scoring
Agents start at **100.0 Trust**:
- Successful compliance: `+0.2`
- Mandate violation: `-5.0`
- Replay/Duplicate attempt: `-3.0`
- Intent drift: `-8.0`
- Customer dispute: `-10.0`
- Confirmed fraud: `-20.0`
*Agents falling below 40 trust are automatically SUSPENDED.*

### 5. Razorpay Test Mode Integration
- Seamless creation of Test Mode orders (`order_TL_...`) exclusively for approved transactions.
- Webhook signature verification (`x-razorpay-signature`) with HMAC-SHA256.
- Strictly isolated credentials: secrets reside purely on the backend.

---

## 🚀 Quickstart Guide

### Prerequisites
- Node.js >= 18
- pnpm >= 9 (`npm install -g pnpm`)

### 1. Clone & Install
```bash
git clone https://github.com/kindaakshat/Dhanvy.git trustlayer
cd trustlayer
pnpm install
```

### 2. Database Migration & Seed
```bash
# Push Prisma schema and seed realistic demo data
pnpm --filter @trustlayer/api run seed
```

### 3. Run Development Servers
```bash
# Starts Express API (:3001) and Next.js Web (:3000)
pnpm dev
```

- **Frontend Console**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Health Check**: `curl http://localhost:3001/api/health`

---

## 🧪 Evaluation Harness

TrustLayer includes an automated evaluation harness measuring deterministic accuracy, precision, and recall against attack scenarios:

```bash
pnpm evaluate
```

### Measured Benchmark Output
```
===============================================================
        TRUSTLAYER DETERMINISTIC EVALUATION HARNESS            
===============================================================
 Total Cases Evaluated   : 10
 Correct Decisions       : 10
 Incorrect Decisions     : 0
 System Accuracy         : 100.0%
---------------------------------------------------------------
 True Positives (Blocked Attacks)       : 7
 True Negatives (Approved Legitimate)   : 3
 False Positives (Legitimate Blocked)   : 0
 False Negatives (Attacks Leaked)       : 0
---------------------------------------------------------------
 Precision               : 100.0%
 Recall                  : 100.0%
===============================================================
```

---

## 🌐 Production Deployment

### Frontend (Vercel)
Deploy `apps/web` directly to Vercel:
- Build command: `pnpm --filter web run build`
- Output directory: `.next`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL`: Your Render backend URL

### Backend (Render)
Deploy `apps/api` via the included [`render.yaml`](./render.yaml):
- Environment Variables:
  - `DATABASE_URL`: PostgreSQL / Supabase connection string
  - `RAZORPAY_KEY_ID`: Razorpay Test Key
  - `RAZORPAY_KEY_SECRET`: Razorpay Test Secret
  - `RAZORPAY_WEBHOOK_SECRET`: Webhook Secret

---

## 📜 License
MIT License. Built with precision for autonomous payment security.
