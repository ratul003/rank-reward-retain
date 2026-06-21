# Rank, Reward, Retain

**Portfolio Project 6** — Expert scoring, compensation design, and retention framework built for an on-demand expert marketplace.

> The marketplace had experts but no intelligence about them. I built the full supply intelligence layer from scratch: a TOPSIS scoring system, a dynamic revenue framework, and a creator analytics dashboard — all delivered before the engineering team had capacity to ship anything.

**Live demo:** https://rank-reward-retain.vercel.app  
**Companion project (P5):** https://when-demand-exceeds-supply.vercel.app

---

## The Three Arcs

### Rank — TOPSIS Expert Readiness Score (ERS)

Multi-criteria decision analysis ranking every expert 0–1 against five criteria:

| Criterion       | Type    | Weight |
|----------------|---------|--------|
| CSAT            | Benefit | 0.30   |
| Session Count   | Benefit | 0.25   |
| Retention Rate  | Benefit | 0.20   |
| Response Time   | Cost    | 0.15   |
| Credential Tier | Benefit | 0.10   |

**Why TOPSIS, not a weighted average:** A weighted average is gameable — inflate session count while CSAT drops and the score stays flat. TOPSIS evaluates each expert against both the ideal and anti-ideal profile simultaneously. Per-criterion breakdown always returned, fully interpretable.

**Algorithm:** Euclidean normalisation → weighted matrix → positive/negative ideal → separation distances → relative closeness (ERS).

### Reward — Dynamic Revenue Optimization Framework

Base 30–90%, with seven additive multipliers:

| Factor                        | Multiplier |
|-------------------------------|-----------|
| Legal / Finance category      | +20%      |
| Mental Health / Relationship  | +15%      |
| MENA or SEA region            | +10%      |
| Late night (11pm–4am)         | +15%      |
| 30+ sessions in 90 days       | +10%      |
| Certification within 4 months | +15%      |
| Exclusive contract (3 months) | +25%      |
| Performance milestone         | +5%       |

**Worked example:** Indian mental health expert, MENA users, late night, exclusive contract = 70% revenue share. Built into the number, not an ops team's Slack message.

**Early Bird Packages:** Nine launch packages with 90% revenue share guaranteed for 18 months, designed to bring supply online ahead of demand.

### Retain — Creator Analytics Framework

48 metrics across four modules, all with WoW and MoM deltas:

- **Performance (8 metrics):** Followers, sessions, reshares, reviews, likes, love reacts, views, paid customers
- **Sessions (13 metrics):** Attendees, comments, polls, returning viewers, session time, no shows, dropout, utilization, retention rate, CSAT, creator waiting time
- **Revenue (17 metrics):** Earnings, ARPU, LTV, churn/refund, upsell/cross-sell, LTV-to-CAC, freemium conversion
- **Conversion Funnel (10 metrics):** Download → Sign-up → Session → Transaction, with churn attribution at Expert Reviews, Expert Unavailability, and Payment Page stages

Delivered as a working Google Sheets dashboard (3 tabs) before any analytics engineering was in place.

---

## ERS → AI Training Pipeline

The ERS score became the quality gate for the AI companion's training data:

- ERS ≥ 0.65 (expert quality threshold)
- Session health ≥ 0.60 (resolution + sentiment arc composite)
- Minimum 5 exchanges per conversation
- Positive customer sentiment arc

49.6% pass rate, by design. 248 high-quality pairs beat 500 mediocre ones. The AI companion (trained on 3M+ consultations) reflects this filtering.

### Conversation Intelligence signals extracted per session

| Signal              | Method                          |
|--------------------|---------------------------------|
| Topic classification| Zero-shot classification        |
| Sentiment arc       | Rolling VADER                   |
| Urgency score       | Keyword + embedding classifier  |
| Resolution quality  | Conversation-end sentiment      |
| Expertise signal    | Domain perplexity scoring       |
| Session health      | Weighted composite              |

Output: OpenAI fine-tuning JSONL, HuggingFace datasets, Axolotl / LLaMA-Factory compatible.

---

## Analytics Scripts

| Script | Description |
|--------|-------------|
| `analytics/topsis_ers_calculator.py` | Full TOPSIS algorithm, configurable per preset (wellness, telehealth, tutoring) |
| `analytics/revenue_share_model.py` | Multi-factor revenue share calculator with cohort simulation |
| `analytics/creator_analytics.py` | Creator performance, session, and conversion funnel metrics with WoW/MoM deltas |
| `analytics/ai_pipeline.py` | Conversation intelligence, ERS quality gate, fine-tuning dataset builder |

```bash
pip install numpy pandas scipy
python analytics/topsis_ers_calculator.py
python analytics/revenue_share_model.py
python analytics/creator_analytics.py
python analytics/ai_pipeline.py
```

---

## Outcomes

- **23%** increase in expert quality ratings after TOPSIS scoring implementation
- **95%** supply retention from the dynamic revenue optimization framework
- **300+** verified experts onboarded across 5 wellness categories
- **3M+** consultations now served via the AI companion, trained on quality-gated expert conversations

---

## Tech Stack

**Scoring:** Python 3.11, NumPy, SciPy, Pandas, TOPSIS from scratch  
**Analytics:** dbt (staging + marts), PostgreSQL schema, Segment-compatible event spec  
**AI Pipeline:** Zero-shot NLP, VADER sentiment, PII anonymisation, JSONL output  
**Portfolio Page:** Next.js 16, React, TypeScript — inline SVG charts, no charting libraries

---

## Related

- [Project 5: When Demand Exceeds Supply](https://github.com/ratul003/when-demand-exceeds-supply) — real-time demand-supply intelligence system (P5)
- [Portfolio](https://wahidtratul.com) — full project index
