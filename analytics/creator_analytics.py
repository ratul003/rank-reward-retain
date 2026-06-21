"""
creator_analytics.py

Creator performance metrics, session analytics, and conversion funnel instrumentation
for the Rank, Reward, Retain framework. Generates a synthetic expert-marketplace
dataset and computes all metric modules with WoW and MoM deltas.

Metric modules:
  1. Creator Performance (8 metrics)  — who experts are, their engagement footprint
  2. Session Performance (13 metrics) — quality, sentiment, dropout signals
  3. Conversion Funnel (10 metrics)   — Download → Sign-up → Session → Transaction
     with churn attribution at Expert Reviews, Expert Unavailability, Payment Page

Usage:
    python analytics/creator_analytics.py
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass
from datetime import date, timedelta


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class CreatorPerformanceSnapshot:
    """8 creator-level engagement metrics for a given period."""
    expert_id: str
    period_end: date
    period_days: int
    followers: int
    sessions: int
    reshares: int
    reviews: int
    likes: int
    love_reacts: int
    views: int
    paid_customers: int


@dataclass
class SessionPerformanceSnapshot:
    """13 session-quality metrics for a given period."""
    expert_id: str
    period_end: date
    total_attendees: int
    total_comments: int
    questions_polls: int
    returning_viewers: int
    avg_session_time_min: float
    no_shows: int
    dropout_users: int
    session_utilization: float     # 0–1
    retention_rate: float          # repeated customers / total customers
    poll_reengagement: float       # 0–1
    feedback_reengagement: float   # 0–1
    csat: float                    # 1–5
    creator_waiting_time_min: float


@dataclass
class FunnelSnapshot:
    """10 funnel + churn attribution metrics for a given period."""
    period_end: date
    downloads: int
    signups: int
    sessions_started: int
    transactions: int
    # Churn attribution
    expert_reviews_churn: int       # left at expert reviews stage
    expert_unavailability_churn: int
    payment_page_churn: int
    # Derived
    click_through_rate: float
    service_conversion_rate: float


# ── Synthetic data generator ──────────────────────────────────────────────────

class CreatorAnalyticsSimulator:
    def __init__(self, n_experts: int = 50, n_weeks: int = 12, seed: int = 42):
        self.n_experts = n_experts
        self.n_weeks = n_weeks
        self.rng = np.random.default_rng(seed)
        self.categories = ["astrology", "mental_health", "relationship",
                           "financial_coaching", "reproductive"]

    def generate_creator_performance(self) -> pd.DataFrame:
        rows = []
        for exp_i in range(self.n_experts):
            cat = self.rng.choice(self.categories)
            # Base characteristics vary by expert
            follower_base = int(self.rng.integers(50, 5000))
            session_base  = int(self.rng.integers(2, 60))

            for w in range(self.n_weeks):
                period_end = date(2024, 9, 1) + timedelta(weeks=w)
                # Trend: slight growth over time
                trend = 1.0 + w * 0.02
                rows.append({
                    "expert_id":    f"exp_{exp_i:03d}",
                    "category":     cat,
                    "period_end":   period_end,
                    "period_days":  7,
                    "followers":    int(follower_base * trend * self.rng.uniform(0.95, 1.1)),
                    "sessions":     max(0, int(session_base * trend * self.rng.uniform(0.7, 1.3))),
                    "reshares":     int(self.rng.integers(0, 40)),
                    "reviews":      int(self.rng.integers(0, 20)),
                    "likes":        int(self.rng.integers(10, 500)),
                    "love_reacts":  int(self.rng.integers(5, 200)),
                    "views":        int(self.rng.integers(100, 10000)),
                    "paid_customers": int(self.rng.integers(1, 80)),
                })
        return pd.DataFrame(rows)

    def generate_session_performance(self) -> pd.DataFrame:
        rows = []
        for exp_i in range(self.n_experts):
            for w in range(self.n_weeks):
                period_end = date(2024, 9, 1) + timedelta(weeks=w)
                attendees = int(self.rng.integers(5, 120))
                rows.append({
                    "expert_id":              f"exp_{exp_i:03d}",
                    "period_end":             period_end,
                    "total_attendees":        attendees,
                    "total_comments":         int(self.rng.integers(0, attendees)),
                    "questions_polls":        int(self.rng.integers(0, max(1, attendees // 3))),
                    "returning_viewers":      int(self.rng.integers(0, attendees)),
                    "avg_session_time_min":   round(float(self.rng.uniform(15, 90)), 1),
                    "no_shows":               int(self.rng.integers(0, 10)),
                    "dropout_users":          int(self.rng.integers(0, max(1, attendees // 5))),
                    "session_utilization":    round(float(self.rng.uniform(0.4, 1.0)), 3),
                    "retention_rate":         round(float(self.rng.uniform(0.15, 0.85)), 3),
                    "poll_reengagement":      round(float(self.rng.uniform(0.1, 0.7)), 3),
                    "feedback_reengagement":  round(float(self.rng.uniform(0.1, 0.6)), 3),
                    "csat":                   round(float(self.rng.uniform(3.0, 5.0)), 2),
                    "creator_waiting_time_min": round(float(self.rng.uniform(2.0, 45.0)), 1),
                })
        return pd.DataFrame(rows)

    def generate_funnel(self) -> pd.DataFrame:
        rows = []
        for w in range(self.n_weeks):
            period_end = date(2024, 9, 1) + timedelta(weeks=w)
            # Improve over time as platform matures
            improvement = 1.0 + w * 0.03
            downloads   = int(self.rng.integers(800, 2000) * improvement)
            signup_rate = self.rng.uniform(0.30, 0.55)
            signups     = int(downloads * signup_rate)
            session_rate= self.rng.uniform(0.40, 0.70)
            sessions    = int(signups * session_rate)
            txn_rate    = self.rng.uniform(0.35, 0.65)
            transactions= int(sessions * txn_rate)

            reviews_churn  = int(signups * self.rng.uniform(0.04, 0.12))
            unavail_churn  = int(signups * self.rng.uniform(0.08, 0.20))
            payment_churn  = int(sessions * self.rng.uniform(0.05, 0.15))

            rows.append({
                "period_end":                  period_end,
                "downloads":                   downloads,
                "signups":                     signups,
                "sessions_started":            sessions,
                "transactions":                transactions,
                "expert_reviews_churn":        reviews_churn,
                "expert_unavailability_churn": unavail_churn,
                "payment_page_churn":          payment_churn,
                "click_through_rate":          round(signups / max(1, downloads), 4),
                "service_conversion_rate":     round(transactions / max(1, sessions), 4),
            })
        return pd.DataFrame(rows)


# ── WoW / MoM delta helper ────────────────────────────────────────────────────

def add_deltas(df: pd.DataFrame, metric_cols: list[str], date_col: str = "period_end",
               group_cols: Optional[list[str]] = None) -> pd.DataFrame:
    """Adds WoW (lag-1) and MoM (lag-4) delta columns for each metric."""
    df = df.sort_values([*(group_cols or []), date_col])
    for col in metric_cols:
        if group_cols:
            df[f"{col}_wow"] = df.groupby(group_cols)[col].pct_change(1).round(4)
            df[f"{col}_mom"] = df.groupby(group_cols)[col].pct_change(4).round(4)
        else:
            df[f"{col}_wow"] = df[col].pct_change(1).round(4)
            df[f"{col}_mom"] = df[col].pct_change(4).round(4)
    return df

from typing import Optional


# ── Demo ─────────────────────────────────────────────────────────────────────

def main() -> None:
    sim = CreatorAnalyticsSimulator(n_experts=50, n_weeks=12)

    print("Creator Analytics Framework — Wellness (Synthetic Data)\n")

    # Module 1: Creator Performance
    perf = sim.generate_creator_performance()
    perf_agg = perf.groupby("period_end")[["sessions", "views", "paid_customers", "reviews"]].sum()
    perf_agg = add_deltas(perf_agg.reset_index(), ["sessions", "views", "paid_customers"])
    print("Module 1: Creator Performance (Platform Aggregate, Weekly)\n")
    print(perf_agg[["period_end", "sessions", "sessions_wow", "sessions_mom",
                     "views", "paid_customers"]].tail(6).to_string(index=False))

    print("\n\nModule 2: Session Performance (Top 5 Experts, Latest Week)\n")
    sess = sim.generate_session_performance()
    latest = sess[sess["period_end"] == sess["period_end"].max()]
    top = latest.nlargest(5, "csat")[["expert_id", "csat", "retention_rate",
                                      "session_utilization", "creator_waiting_time_min",
                                      "dropout_users"]]
    print(top.to_string(index=False))

    print("\n\nModule 3: Conversion Funnel (All Weeks)\n")
    funnel = sim.generate_funnel()
    funnel_display = funnel[["period_end", "downloads", "signups", "sessions_started",
                              "transactions", "service_conversion_rate",
                              "expert_reviews_churn", "expert_unavailability_churn",
                              "payment_page_churn"]]
    print(funnel_display.to_string(index=False))

    # Churn attribution summary
    total_churn = funnel[["expert_reviews_churn", "expert_unavailability_churn",
                           "payment_page_churn"]].sum()
    total_total = total_churn.sum()
    print("\nChurn attribution (total, 12-week period):")
    for stage, n in total_churn.items():
        print(f"  {stage:<35}: {int(n):>6}  ({n/total_total:.1%})")

    # Category breakdown
    print("\n\nModule 1 by Category (latest 4 weeks average):\n")
    recent = perf[perf["period_end"] >= perf["period_end"].max() - timedelta(weeks=3)]
    cat_agg = recent.groupby("category")[["sessions", "views", "paid_customers", "csat"] if "csat" in perf.columns else ["sessions", "views", "paid_customers"]].mean().round(1)
    print(cat_agg.to_string())


if __name__ == "__main__":
    main()
