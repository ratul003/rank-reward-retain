"""
topsis_ers_calculator.py

TOPSIS-based Expert Readiness Score (ERS) for the Rank, Reward, Retain framework.
Ranks experts across five criteria, producing a score in [0, 1] — where 1 is closest
to the ideal expert profile. Interpretable, auditable, and ungameable.

Algorithm steps:
  1. Build decision matrix (experts × criteria)
  2. Euclidean normalisation (removes scale differences)
  3. Apply criterion weights
  4. Determine positive ideal (A+) and negative ideal (A-)
  5. Compute separation distances
  6. Compute relative closeness (ERS)

Usage:
    python analytics/topsis_ers_calculator.py
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ── Types ──────────────────────────────────────────────────────────────────────

class CriterionType(Enum):
    BENEFIT = "benefit"  # higher is better
    COST    = "cost"     # lower is better


@dataclass
class Criterion:
    name: str
    type: CriterionType
    weight: float


@dataclass
class Expert:
    id: str
    name: str
    category: str
    csat: float             # 1.0 – 5.0
    session_count: int      # sessions completed (30-day window)
    retention_rate: float   # 0.0 – 1.0
    response_time: float    # minutes (cost criterion)
    credential_tier: int    # 1 – 5


@dataclass
class ERSResult:
    expert_id: str
    expert_name: str
    category: str
    ers_score: float
    rank: int
    breakdown: dict[str, dict]


# ── Canonical criteria config (Coto wellness default) ─────────────────────────

COTO_WELLNESS_CRITERIA: list[Criterion] = [
    Criterion("csat",           CriterionType.BENEFIT, 0.30),
    Criterion("session_count",  CriterionType.BENEFIT, 0.25),
    Criterion("retention_rate", CriterionType.BENEFIT, 0.20),
    Criterion("response_time",  CriterionType.COST,    0.15),
    Criterion("credential_tier",CriterionType.BENEFIT, 0.10),
]

TELEHEALTH_CRITERIA: list[Criterion] = [
    Criterion("csat",           CriterionType.BENEFIT, 0.30),
    Criterion("session_count",  CriterionType.BENEFIT, 0.10),
    Criterion("retention_rate", CriterionType.BENEFIT, 0.15),
    Criterion("response_time",  CriterionType.COST,    0.10),
    Criterion("credential_tier",CriterionType.BENEFIT, 0.35),
]

TUTORING_CRITERIA: list[Criterion] = [
    Criterion("csat",           CriterionType.BENEFIT, 0.25),
    Criterion("session_count",  CriterionType.BENEFIT, 0.15),
    Criterion("retention_rate", CriterionType.BENEFIT, 0.35),
    Criterion("response_time",  CriterionType.COST,    0.15),
    Criterion("credential_tier",CriterionType.BENEFIT, 0.10),
]


# ── TOPSIS Engine ─────────────────────────────────────────────────────────────

class TopsisERS:
    """
    TOPSIS Expert Readiness Score engine.
    Configurable per preset; returns per-expert ERS with full breakdown.
    """

    def __init__(self, criteria: list[Criterion], min_sessions: int = 5):
        self.criteria = criteria
        self.min_sessions = min_sessions
        assert abs(sum(c.weight for c in criteria) - 1.0) < 1e-9, \
            "Criterion weights must sum to 1.0"

    def score(self, experts: list[Expert]) -> list[ERSResult]:
        eligible = [e for e in experts if e.session_count >= self.min_sessions]
        if len(eligible) < 2:
            raise ValueError(f"At least 2 experts with >= {self.min_sessions} sessions required")

        names = [c.name for c in self.criteria]
        X = np.array([self._extract_row(e) for e in eligible], dtype=float)

        # Step 2: Euclidean normalisation
        col_norms = np.sqrt((X ** 2).sum(axis=0))
        col_norms[col_norms == 0] = 1.0
        R = X / col_norms

        # Step 3: Apply weights
        W = np.array([c.weight for c in self.criteria])
        V = R * W

        # Step 4: Ideal solutions
        A_pos = np.where(
            [c.type == CriterionType.BENEFIT for c in self.criteria],
            V.max(axis=0), V.min(axis=0)
        )
        A_neg = np.where(
            [c.type == CriterionType.BENEFIT for c in self.criteria],
            V.min(axis=0), V.max(axis=0)
        )

        # Step 5: Separation distances
        d_pos = np.sqrt(((V - A_pos) ** 2).sum(axis=1))
        d_neg = np.sqrt(((V - A_neg) ** 2).sum(axis=1))

        # Step 6: ERS (relative closeness)
        denom = d_pos + d_neg
        denom[denom == 0] = 1e-12
        ers = d_neg / denom

        # Sort by score descending for ranking
        order = np.argsort(-ers)
        results = []
        for rank_idx, exp_idx in enumerate(order):
            e = eligible[exp_idx]
            breakdown = {}
            for j, c in enumerate(self.criteria):
                breakdown[c.name] = {
                    "raw": self._extract_row(e)[j],
                    "normalised": round(float(R[exp_idx, j]), 4),
                    "weighted":   round(float(V[exp_idx, j]), 4),
                    "contribution": "high" if W[j] >= 0.25 else ("medium" if W[j] >= 0.15 else "low"),
                }
            results.append(ERSResult(
                expert_id=e.id,
                expert_name=e.name,
                category=e.category,
                ers_score=round(float(ers[exp_idx]), 4),
                rank=rank_idx + 1,
                breakdown=breakdown,
            ))
        return results

    def _extract_row(self, e: Expert) -> list[float]:
        return [e.csat, float(e.session_count), e.retention_rate,
                e.response_time, float(e.credential_tier)]


# ── Synthetic expert pool ─────────────────────────────────────────────────────

def build_expert_pool(n: int = 20, rng: Optional[np.random.Generator] = None) -> list[Expert]:
    rng = rng or np.random.default_rng(seed=42)
    categories = ["astrology", "mental_health", "relationship", "financial_coaching", "reproductive"]
    names = [
        "Arjun S.", "Priya M.", "Zara K.", "Amir H.", "Nadia R.",
        "Rohan D.", "Leila F.", "Vikram P.", "Sara A.", "Karan T.",
        "Meera L.", "Omar B.", "Divya N.", "Tariq J.", "Anjali V.",
        "Cyrus M.", "Pooja G.", "Faisal A.", "Riya C.", "Khalid W.",
    ][:n]
    experts = []
    for i, name in enumerate(names):
        cat = rng.choice(categories)
        sessions = int(rng.integers(5, 200))
        experts.append(Expert(
            id=f"exp_{i:03d}",
            name=name,
            category=cat,
            csat=round(float(rng.uniform(2.5, 5.0)), 2),
            session_count=sessions,
            retention_rate=round(float(rng.uniform(0.20, 0.90)), 3),
            response_time=round(float(rng.uniform(1.5, 15.0)), 1),
            credential_tier=int(rng.integers(1, 6)),
        ))
    return experts


# ── Demo ─────────────────────────────────────────────────────────────────────

def main() -> None:
    rng = np.random.default_rng(42)
    experts = build_expert_pool(20, rng)

    engine = TopsisERS(COTO_WELLNESS_CRITERIA, min_sessions=5)
    results = engine.score(experts)

    print("Expert Readiness Score (ERS) — Coto Wellness Preset\n")
    print(f"{'Rank':<5} {'Name':<14} {'Category':<20} {'ERS':>6}  {'CSAT':>5}  {'Sessions':>8}  {'Retention':>10}  {'Resp Time':>10}  {'Cred':>5}")
    print("-" * 94)
    for r in results:
        e = next(x for x in experts if x.id == r.expert_id)
        print(f"{r.rank:<5} {r.expert_name:<14} {r.category:<20} {r.ers_score:>6.4f}  "
              f"{e.csat:>5.2f}  {e.session_count:>8}  {e.retention_rate:>9.1%}  "
              f"{e.response_time:>9.1f}m  {e.credential_tier:>5}")

    print("\n--- Top Expert Breakdown ---")
    top = results[0]
    print(f"\nRank 1: {top.expert_name} (ERS = {top.ers_score})")
    for cname, detail in top.breakdown.items():
        print(f"  {cname:<16} raw={detail['raw']:<8}  norm={detail['normalised']:.4f}  "
              f"weighted={detail['weighted']:.4f}  contribution={detail['contribution']}")

    # ERS threshold: conversations eligible for AI training
    threshold = 0.65
    eligible_for_ai = [r for r in results if r.ers_score >= threshold]
    print(f"\nAI training gate (ERS ≥ {threshold}): {len(eligible_for_ai)}/{len(results)} experts qualify")
    print("Their conversations may enter the Joy fine-tuning pipeline.")

    # Preset comparison
    print("\n--- Preset comparison (same expert pool) ---")
    for label, criteria in [("Coto Wellness", COTO_WELLNESS_CRITERIA),
                             ("Telehealth",    TELEHEALTH_CRITERIA),
                             ("Tutoring",      TUTORING_CRITERIA)]:
        eng = TopsisERS(criteria, min_sessions=5)
        res = eng.score(experts)
        top3 = [f"#{r.rank} {r.expert_name} ({r.ers_score:.3f})" for r in res[:3]]
        print(f"  {label:<20}: {' | '.join(top3)}")


if __name__ == "__main__":
    main()
