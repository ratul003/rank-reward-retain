"""
topsis_ers_calculator.py

TOPSIS-based Expert Readiness Score (ERS) for the Rank, Reward, Retain framework.
Ranks experts 0-1 against five criteria, where 1 is closest to the ideal expert
profile simultaneously across all dimensions.

Algorithm steps:
  1. Build decision matrix (experts x criteria)
  2. Euclidean normalisation (removes scale differences without distorting ratios)
  3. Apply criterion weights
  4. Determine positive ideal (A+) and negative ideal (A-)
  5. Compute Euclidean separation distances
  6. Compute relative closeness (ERS = d- / (d+ + d-))

Usage:
    python analytics/topsis_ers_calculator.py
    python analytics/topsis_ers_calculator.py --preset telehealth --top 5
    python analytics/topsis_ers_calculator.py --preset wellness --compare
    python analytics/topsis_ers_calculator.py --preset tutoring --export results.csv

Presets:
    wellness   - Coto wellness platform (CSAT + volume + retention + speed + credential)
    telehealth - Medical/clinical (credential tier dominates; volume secondary)
    tutoring   - EdTech (retention dominates; students coming back = quality signal)
    freelance  - Fiverr-type (response time dominates; credential barely matters)
"""

from __future__ import annotations

import argparse
import csv
import sys
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

FREELANCE_CRITERIA: list[Criterion] = [
    Criterion("csat",           CriterionType.BENEFIT, 0.25),
    Criterion("session_count",  CriterionType.BENEFIT, 0.20),
    Criterion("retention_rate", CriterionType.BENEFIT, 0.20),
    Criterion("response_time",  CriterionType.COST,    0.30),  # speed is the product
    Criterion("credential_tier",CriterionType.BENEFIT, 0.05),
]

PRESET_MAP = {
    "wellness":  COTO_WELLNESS_CRITERIA,
    "telehealth": TELEHEALTH_CRITERIA,
    "tutoring":  TUTORING_CRITERIA,
    "freelance": FREELANCE_CRITERIA,
}


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


# ── Export helper ─────────────────────────────────────────────────────────────

def export_to_csv(results: list[ERSResult], experts: list[Expert], path: str) -> None:
    rows = []
    exp_map = {e.id: e for e in experts}
    for r in results:
        e = exp_map[r.expert_id]
        rows.append({
            "rank": r.rank, "name": r.expert_name, "category": r.category,
            "ers_score": r.ers_score,
            "csat": e.csat, "session_count": e.session_count,
            "retention_rate": e.retention_rate, "response_time": e.response_time,
            "credential_tier": e.credential_tier,
            "ai_eligible": r.ers_score >= 0.65,
        })
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Exported {len(rows)} rows to {path}")


# ── Preset comparison ──────────────────────────────────────────────────────────

def compare_presets(experts: list[Expert]) -> None:
    print("\n" + "=" * 70)
    print("PRESET COMPARISON: same expert pool, different industry weights")
    print("=" * 70)
    print("Ranking shifts reveal which criteria drive quality in each vertical.\n")

    preset_results: dict[str, list[ERSResult]] = {}
    for label, criteria in PRESET_MAP.items():
        eng = TopsisERS(criteria, min_sessions=5)
        preset_results[label] = eng.score(experts)

    # Header
    col = 18
    header = f"{'Expert':<14}" + "".join(f"{p:<{col}}" for p in PRESET_MAP)
    print(header)
    print("-" * len(header))

    # Collect all expert names in wellness order
    for r in preset_results["wellness"]:
        row = f"{r.expert_name:<14}"
        for label, res in preset_results.items():
            match = next((x for x in res if x.expert_name == r.expert_name), None)
            if match:
                row += f"#{match.rank} ({match.ers_score:.3f}){'':<{col - 14}}"
        print(row)

    print("\nKey insight: Credential tier weight (5% freelance vs 35% telehealth)")
    print("shifts rankings dramatically. Response time weight (30% freelance vs")
    print("10% telehealth) equally so. Same expert, different platform = different rank.")


# ── CLI + Demo ─────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="TOPSIS Expert Readiness Score (ERS) calculator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python analytics/topsis_ers_calculator.py
  python analytics/topsis_ers_calculator.py --preset telehealth --top 5
  python analytics/topsis_ers_calculator.py --preset wellness --compare
  python analytics/topsis_ers_calculator.py --preset tutoring --export results.csv
        """,
    )
    parser.add_argument("--preset",  choices=list(PRESET_MAP.keys()), default="wellness",
                        help="Industry weight preset (default: wellness)")
    parser.add_argument("--top",     type=int, default=None,
                        help="Show only top N experts")
    parser.add_argument("--compare", action="store_true",
                        help="Compare rankings across all presets")
    parser.add_argument("--export",  type=str, default=None, metavar="FILE.csv",
                        help="Export results to CSV")
    parser.add_argument("--pool",    type=int, default=20, metavar="N",
                        help="Synthetic expert pool size (default: 20)")
    parser.add_argument("--gate",    type=float, default=0.65, metavar="THRESHOLD",
                        help="AI training gate threshold (default: 0.65)")

    args = parser.parse_args()

    rng     = np.random.default_rng(42)
    experts = build_expert_pool(args.pool, rng)
    criteria = PRESET_MAP[args.preset]
    engine  = TopsisERS(criteria, min_sessions=5)
    results = engine.score(experts)

    top_n = args.top or len(results)

    label = args.preset.replace("_", " ").title()
    print(f"\nExpert Readiness Score (ERS) — {label} Preset\n")
    print(f"Criteria weights: {', '.join(f'{c.name}={c.weight:.0%}' for c in criteria)}\n")
    print(f"{'Rank':<5} {'Name':<14} {'Category':<20} {'ERS':>6}  {'CSAT':>5}  {'Sessions':>8}  {'Retention':>10}  {'RespTime':>9}  {'Cred':>5}  {'AI Gate':>8}")
    print("-" * 104)
    for r in results[:top_n]:
        e = next(x for x in experts if x.id == r.expert_id)
        gate_str = "PASS" if r.ers_score >= args.gate else "fail"
        print(f"{r.rank:<5} {r.expert_name:<14} {r.category:<20} {r.ers_score:>6.4f}  "
              f"{e.csat:>5.2f}  {e.session_count:>8}  {e.retention_rate:>9.1%}  "
              f"{e.response_time:>8.1f}m  {e.credential_tier:>5}  {gate_str:>8}")

    print(f"\nTop expert breakdown: {results[0].expert_name} (ERS = {results[0].ers_score})")
    for cname, detail in results[0].breakdown.items():
        bar = "█" * int(detail["weighted"] * 200)
        print(f"  {cname:<18} raw={str(detail['raw']):<8} weighted={detail['weighted']:.4f}  {bar}")

    eligible = [r for r in results if r.ers_score >= args.gate]
    print(f"\nAI gate (ERS >= {args.gate}): {len(eligible)}/{len(results)} experts qualify  "
          f"({len(eligible)/len(results):.0%} pass rate)")

    if args.compare:
        compare_presets(experts)

    if args.export:
        export_to_csv(results, experts, args.export)


if __name__ == "__main__":
    main()
