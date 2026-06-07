"""
revenue_share_model.py

Multi-factor dynamic revenue share model for the Rank, Reward, Retain framework.
Computes expert revenue share percentage from a base rate plus additive multipliers
across category, region, time band, volume, certification, exclusivity, and performance.

Designed to:
  - Onboard expert supply ahead of demand growth (early-bird packages)
  - Reward high-performing experts with compounding multipliers
  - Cap total share at 90% to preserve platform margin

Usage:
    python analytics/revenue_share_model.py
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional
import pandas as pd
import numpy as np


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class ExpertProfile:
    id: str
    name: str
    category: str
    region: str                          # "MENA" | "SEA" | "IN" | "ROW"
    base_revenue_share: float            # 0.30 – 0.70 (negotiated at onboarding)
    time_band: str                       # "late_night" | "peak_evening" | "daytime"
    sessions_last_90d: int
    certified: bool
    months_since_onboarding: int
    exclusive_contract: bool
    review_threshold_met: bool           # CSAT ≥ 4.5 sustained
    retention_threshold_met: bool        # retention rate ≥ 0.70 sustained


@dataclass
class Multiplier:
    name: str
    value: float                         # additive percentage points
    applied: bool
    reason: str


@dataclass
class RevenueShareResult:
    expert_id: str
    expert_name: str
    base_pct: float
    multipliers: list[Multiplier]
    total_pct: float                     # capped at 90%
    uncapped_pct: float
    cap_applied: bool
    monthly_sessions_est: int
    avg_session_fee: float
    monthly_earnings_est: float


# ── Multiplier table ──────────────────────────────────────────────────────────

CATEGORY_MULTIPLIERS: dict[str, float] = {
    "legal":              0.20,
    "financial_coaching": 0.20,
    "mental_health":      0.15,
    "relationship":       0.15,
    "reproductive":       0.15,
    "astrology":          0.00,
}

REGION_MULTIPLIERS: dict[str, float] = {
    "MENA": 0.10,
    "SEA":  0.10,
    "IN":   0.00,
    "ROW":  0.00,
}

TIME_BAND_MULTIPLIERS: dict[str, float] = {
    "late_night":    0.15,
    "peak_evening":  0.05,
    "daytime":       0.00,
}

VOLUME_THRESHOLD_SESSIONS = 30
VOLUME_MULTIPLIER = 0.10

CERTIFICATION_WINDOW_MONTHS = 4
CERTIFICATION_MULTIPLIER = 0.15

EXCLUSIVITY_WINDOW_MONTHS = 3
EXCLUSIVITY_MULTIPLIER = 0.25

PERFORMANCE_MULTIPLIER = 0.05   # review threshold + retention threshold both met

REVENUE_SHARE_CAP = 0.90
BASE_REVENUE_SHARE_MIN = 0.30
BASE_REVENUE_SHARE_MAX = 0.90


# ── Revenue share calculator ──────────────────────────────────────────────────

class RevenueShareCalculator:

    def compute(
        self,
        profile: ExpertProfile,
        avg_session_fee: float = 500.0,
        sessions_per_month_est: int = 20,
    ) -> RevenueShareResult:

        mults: list[Multiplier] = []

        # Category
        cat_mult = CATEGORY_MULTIPLIERS.get(profile.category, 0.0)
        mults.append(Multiplier(
            name="Category",
            value=cat_mult,
            applied=cat_mult > 0,
            reason=f"{profile.category} category (+{cat_mult:.0%})" if cat_mult else f"{profile.category} — no category uplift",
        ))

        # Region
        region_mult = REGION_MULTIPLIERS.get(profile.region, 0.0)
        mults.append(Multiplier(
            name="Region",
            value=region_mult,
            applied=region_mult > 0,
            reason=f"{profile.region} region (+{region_mult:.0%})" if region_mult else f"{profile.region} — no region uplift",
        ))

        # Time band
        time_mult = TIME_BAND_MULTIPLIERS.get(profile.time_band, 0.0)
        mults.append(Multiplier(
            name="Time Band",
            value=time_mult,
            applied=time_mult > 0,
            reason=f"{profile.time_band.replace('_', ' ')} (+{time_mult:.0%})" if time_mult else "Daytime — no time band uplift",
        ))

        # Volume
        vol_applied = profile.sessions_last_90d >= VOLUME_THRESHOLD_SESSIONS
        vol_mult = VOLUME_MULTIPLIER if vol_applied else 0.0
        mults.append(Multiplier(
            name="Volume",
            value=vol_mult,
            applied=vol_applied,
            reason=f"{profile.sessions_last_90d} sessions/90d ≥ {VOLUME_THRESHOLD_SESSIONS} threshold" if vol_applied
                   else f"{profile.sessions_last_90d} sessions/90d — below {VOLUME_THRESHOLD_SESSIONS} threshold",
        ))

        # Certification accelerator
        cert_applied = profile.certified and profile.months_since_onboarding <= CERTIFICATION_WINDOW_MONTHS
        cert_mult = CERTIFICATION_MULTIPLIER if cert_applied else 0.0
        mults.append(Multiplier(
            name="Certification Accelerator",
            value=cert_mult,
            applied=cert_applied,
            reason=f"Certified within {CERTIFICATION_WINDOW_MONTHS} months of onboarding" if cert_applied
                   else "Not certified within accelerator window",
        ))

        # Exclusivity
        excl_applied = profile.exclusive_contract and profile.months_since_onboarding <= EXCLUSIVITY_WINDOW_MONTHS
        excl_mult = EXCLUSIVITY_MULTIPLIER if excl_applied else 0.0
        mults.append(Multiplier(
            name="Exclusive Contract",
            value=excl_mult,
            applied=excl_applied,
            reason=f"Exclusive contract within {EXCLUSIVITY_WINDOW_MONTHS} months" if excl_applied
                   else "No exclusive contract in window",
        ))

        # Performance milestone
        perf_applied = profile.review_threshold_met and profile.retention_threshold_met
        perf_mult = PERFORMANCE_MULTIPLIER if perf_applied else 0.0
        mults.append(Multiplier(
            name="Performance Milestone",
            value=perf_mult,
            applied=perf_applied,
            reason="CSAT ≥ 4.5 + retention ≥ 70% sustained" if perf_applied
                   else "Performance milestone not yet met",
        ))

        uncapped = profile.base_revenue_share + sum(m.value for m in mults)
        total = min(uncapped, REVENUE_SHARE_CAP)
        monthly_earnings = sessions_per_month_est * avg_session_fee * total

        return RevenueShareResult(
            expert_id=profile.id,
            expert_name=profile.name,
            base_pct=profile.base_revenue_share,
            multipliers=mults,
            total_pct=round(total, 4),
            uncapped_pct=round(uncapped, 4),
            cap_applied=uncapped > REVENUE_SHARE_CAP,
            monthly_sessions_est=sessions_per_month_est,
            avg_session_fee=avg_session_fee,
            monthly_earnings_est=round(monthly_earnings, 2),
        )


# ── Scenario: sweep a cohort of experts ───────────────────────────────────────

def simulate_cohort(profiles: list[ExpertProfile], avg_fee: float = 500.0) -> pd.DataFrame:
    calc = RevenueShareCalculator()
    rows = []
    for p in profiles:
        r = calc.compute(p, avg_session_fee=avg_fee)
        row = {
            "expert": r.expert_name,
            "category": p.category,
            "region": p.region,
            "base_%": f"{r.base_pct:.0%}",
            "total_%": f"{r.total_pct:.0%}",
            "cap_applied": r.cap_applied,
            "monthly_earnings_est": r.monthly_earnings_est,
        }
        for m in r.multipliers:
            if m.applied:
                row[m.name] = f"+{m.value:.0%}"
        rows.append(row)
    return pd.DataFrame(rows).fillna("-")


# ── Demo ─────────────────────────────────────────────────────────────────────

def main() -> None:
    calc = RevenueShareCalculator()

    # Worked example from the project docs
    print("Rank, Reward, Retain — Revenue Share Calculator\n")
    print("Worked Example: Indian mental health expert, MENA users, late night, 20 sessions/month\n")

    profile = ExpertProfile(
        id="exp_worked",
        name="Priya M.",
        category="mental_health",
        region="MENA",
        base_revenue_share=0.30,
        time_band="late_night",
        sessions_last_90d=20,           # below 30 — volume multiplier does not fire
        certified=True,
        months_since_onboarding=3,
        exclusive_contract=True,
        review_threshold_met=False,
        retention_threshold_met=False,
    )

    result = calc.compute(profile, avg_session_fee=500, sessions_per_month_est=20)

    print(f"Base revenue share      : {result.base_pct:.0%}")
    for m in result.multipliers:
        status = f"+{m.value:.0%}" if m.applied else "  (not applied)"
        print(f"  {m.name:<26}: {status}  — {m.reason}")
    print(f"  {'─'*55}")
    print(f"  Total (uncapped)       : {result.uncapped_pct:.0%}")
    if result.cap_applied:
        print(f"  Cap applied (90% max)  : {result.total_pct:.0%}")
    else:
        print(f"  Final revenue share    : {result.total_pct:.0%}")

    print(f"\n  Estimated monthly earnings: {result.monthly_sessions_est} sessions × "
          f"{result.avg_session_fee:.0f} × {result.total_pct:.0%} = "
          f"{result.monthly_earnings_est:,.0f}")

    print("\n\n--- Cohort simulation ---\n")

    cohort = [
        ExpertProfile("e1", "Arjun S.",  "astrology",          "IN",   0.30, "daytime",    12, False, 7, False, False, False),
        ExpertProfile("e2", "Zara K.",   "mental_health",      "MENA", 0.35, "late_night", 45, True,  2, True,  True,  True ),
        ExpertProfile("e3", "Amir H.",   "financial_coaching", "SEA",  0.40, "peak_evening",35, True, 8, False, True,  False),
        ExpertProfile("e4", "Nadia R.",  "relationship",       "ROW",  0.30, "late_night",  8, False, 1, False, False, False),
        ExpertProfile("e5", "Vikram P.", "reproductive",       "IN",   0.45, "late_night", 32, True,  3, True,  True,  True ),
        ExpertProfile("e6", "Sara A.",   "legal",              "MENA", 0.30, "daytime",    60, True,  4, True,  True,  True ),
    ]

    df = simulate_cohort(cohort, avg_fee=500)
    print(df.to_string(index=False))

    # Revenue share distribution
    shares = [calc.compute(p, avg_session_fee=500).total_pct for p in cohort]
    print(f"\nRevenue share range: {min(shares):.0%} – {max(shares):.0%}")
    print(f"Average: {np.mean(shares):.0%}")


if __name__ == "__main__":
    main()
