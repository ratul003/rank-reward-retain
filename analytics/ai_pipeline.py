"""
ai_pipeline.py

Conversation intelligence and AI training data pipeline for the Rank, Reward, Retain
framework. Demonstrates the quality gate that determined which expert conversations
entered the AI companion's fine-tuning dataset — ERS threshold + session health score.

Pipeline stages:
  1. Conversation Intelligence Layer — extract signals from session transcripts
  2. ERS Quality Gate — only conversations above threshold enter training
  3. AI Dataset Builder — format as instruction fine-tuning pairs (OpenAI-compatible)
  4. System prompt generator — per-category system prompts for the fine-tuned model

This is the methodology behind an AI companion (3M+ consultations, trained
on real expert conversations quality-gated by the ERS system).

Usage:
    python analytics/ai_pipeline.py
"""

from __future__ import annotations

import json
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional


# ── Types ──────────────────────────────────────────────────────────────────────

@dataclass
class ConversationSignals:
    """Extracted per-conversation NLP signals."""
    conversation_id: str
    expert_id: str
    category: str
    exchange_count: int
    topic_category: str                  # zero-shot classification output
    sentiment_start: float               # -1 to +1
    sentiment_end: float                 # -1 to +1
    urgency_score: float                 # 0–1
    resolution_quality: float            # 0–1
    expertise_signal: float              # 0–1
    session_health: float                # composite
    expert_ers: float                    # from ERS engine
    csat: Optional[float]                # explicit customer rating, if given


@dataclass
class TrainingRecord:
    """Instruction fine-tuning pair (OpenAI-compatible)."""
    system_prompt: str
    user_message: str
    assistant_message: str
    metadata: dict


@dataclass
class PipelineResult:
    total_conversations: int
    eligible: int
    excluded: int
    exclusion_breakdown: dict[str, int]
    training_records: list[TrainingRecord]
    quality_stats: dict


# ── System prompt templates ────────────────────────────────────────────────────

SYSTEM_PROMPTS: dict[str, str] = {
    "astrology": (
        "You are a verified astrology expert on a faith-inclusive wellness platform. "
        "Respond with empathy, cultural sensitivity, and domain accuracy. "
        "Adapt your tone to the user's belief system and level of familiarity with astrological concepts."
    ),
    "mental_health": (
        "You are a verified mental health counsellor on a confidential wellness platform. "
        "Respond with evidence-based support, active listening, and appropriate professional referral when needed. "
        "Never provide clinical diagnoses. Prioritise emotional safety."
    ),
    "relationship": (
        "You are a certified relationship coach on a private wellness platform. "
        "Guide with practical, non-judgmental advice grounded in communication and attachment research. "
        "Maintain strict confidentiality."
    ),
    "reproductive": (
        "You are a verified reproductive health expert. "
        "Respond with clinical accuracy, full confidentiality, and cultural sensitivity. "
        "Provide factual guidance and refer to healthcare providers where clinical intervention is needed."
    ),
    "financial_coaching": (
        "You are a certified financial coach on a wellness platform. "
        "Provide structured, actionable financial guidance tailored to the user's context. "
        "Do not provide investment advice regulated under local financial law."
    ),
}


# ── Conversation Intelligence Layer ───────────────────────────────────────────

class ConversationIntelligence:
    """
    Simulates the NLP extraction pipeline over session transcripts.
    In production this runs fine-tuned classifiers and VADER-derived sentiment.
    """

    def __init__(self, rng: Optional[np.random.Generator] = None):
        self.rng = rng or np.random.default_rng(42)

    def extract(
        self,
        conversation_id: str,
        expert_id: str,
        category: str,
        exchange_count: int,
        expert_ers: float,
        csat: Optional[float] = None,
    ) -> ConversationSignals:
        # Sentiment tends to improve in good conversations; correlate with ERS
        sentiment_start = float(self.rng.uniform(-0.4, 0.3))
        sentiment_end   = float(np.clip(sentiment_start + expert_ers * 0.6 + self.rng.normal(0, 0.15), -1, 1))
        urgency         = float(self.rng.beta(2, 5))
        resolution      = float(np.clip(expert_ers * 0.8 + self.rng.normal(0, 0.1), 0, 1))
        expertise       = float(np.clip(expert_ers * 0.85 + self.rng.normal(0, 0.08), 0, 1))

        session_health = (
            0.35 * resolution +
            0.30 * max(0, (sentiment_end - sentiment_start) / 2 + 0.5) +
            0.20 * expertise +
            0.15 * min(1, exchange_count / 10)
        )

        return ConversationSignals(
            conversation_id=conversation_id,
            expert_id=expert_id,
            category=category,
            exchange_count=exchange_count,
            topic_category=category,
            sentiment_start=round(sentiment_start, 4),
            sentiment_end=round(sentiment_end, 4),
            urgency_score=round(urgency, 4),
            resolution_quality=round(resolution, 4),
            expertise_signal=round(expertise, 4),
            session_health=round(session_health, 4),
            expert_ers=expert_ers,
            csat=csat,
        )


# ── ERS Quality Gate ──────────────────────────────────────────────────────────

@dataclass
class QualityGateConfig:
    ers_threshold: float      = 0.65
    session_health_threshold: float = 0.60
    min_exchanges: int        = 5


def passes_gate(sig: ConversationSignals, cfg: QualityGateConfig) -> tuple[bool, str]:
    if sig.expert_ers < cfg.ers_threshold:
        return False, f"expert_ers {sig.expert_ers:.3f} < {cfg.ers_threshold}"
    if sig.session_health < cfg.session_health_threshold:
        return False, f"session_health {sig.session_health:.3f} < {cfg.session_health_threshold}"
    if sig.exchange_count < cfg.min_exchanges:
        return False, f"exchange_count {sig.exchange_count} < {cfg.min_exchanges}"
    return True, "ok"


# ── AI Dataset Builder ────────────────────────────────────────────────────────

class AIDatasetBuilder:

    def __init__(self, gate_config: Optional[QualityGateConfig] = None):
        self.gate = gate_config or QualityGateConfig()

    def build(self, signals: list[ConversationSignals]) -> PipelineResult:
        records: list[TrainingRecord] = []
        exclusion_breakdown: dict[str, int] = {}
        excluded = 0

        for sig in signals:
            passed, reason = passes_gate(sig, self.gate)
            if not passed:
                excluded += 1
                key = reason.split(" ")[0]  # first token of reason
                exclusion_breakdown[key] = exclusion_breakdown.get(key, 0) + 1
                continue

            system_prompt = SYSTEM_PROMPTS.get(sig.category, SYSTEM_PROMPTS["astrology"])
            # In production: user/assistant messages are PII-stripped transcript pairs
            records.append(TrainingRecord(
                system_prompt=system_prompt,
                user_message="[anonymised customer message]",
                assistant_message="[anonymised expert response — quality-gated]",
                metadata={
                    "category":       sig.category,
                    "expert_ers":     sig.expert_ers,
                    "session_health": sig.session_health,
                    "csat":           sig.csat,
                    "credential_tier": None,   # fetched from ERS breakdown in production
                },
            ))

        eligible_signals = [s for s in signals if passes_gate(s, self.gate)[0]]

        quality_stats = {
            "avg_ers":             round(np.mean([s.expert_ers for s in eligible_signals]), 4) if eligible_signals else 0,
            "avg_session_health":  round(np.mean([s.session_health for s in eligible_signals]), 4) if eligible_signals else 0,
            "avg_csat":            round(np.nanmean([s.csat for s in eligible_signals if s.csat]), 4) if eligible_signals else 0,
            "pass_rate":           round(len(records) / max(1, len(signals)), 4),
        }

        return PipelineResult(
            total_conversations=len(signals),
            eligible=len(records),
            excluded=excluded,
            exclusion_breakdown=exclusion_breakdown,
            training_records=records,
            quality_stats=quality_stats,
        )

    def to_jsonl(self, records: list[TrainingRecord]) -> str:
        """Formats training records as OpenAI fine-tuning JSONL."""
        lines = []
        for r in records:
            obj = {
                "messages": [
                    {"role": "system",    "content": r.system_prompt},
                    {"role": "user",      "content": r.user_message},
                    {"role": "assistant", "content": r.assistant_message},
                ],
                "metadata": r.metadata,
            }
            lines.append(json.dumps(obj))
        return "\n".join(lines)


# ── Demo ─────────────────────────────────────────────────────────────────────

def main() -> None:
    rng = np.random.default_rng(42)
    intel = ConversationIntelligence(rng)
    categories = ["astrology", "mental_health", "relationship", "financial_coaching", "reproductive"]

    print("AI Training Pipeline — Wellness (Simulated)\n")

    # Simulate 500 conversations from experts with varying ERS
    signals = []
    for i in range(500):
        cat = rng.choice(categories)
        expert_ers = float(rng.beta(5, 3))   # right-skewed, most experts decent
        csat = float(rng.uniform(2.5, 5.0)) if rng.random() > 0.2 else None
        sig = intel.extract(
            conversation_id=f"conv_{i:04d}",
            expert_id=f"exp_{int(rng.integers(0, 50)):03d}",
            category=cat,
            exchange_count=int(rng.integers(2, 30)),
            expert_ers=expert_ers,
            csat=csat,
        )
        signals.append(sig)

    builder = AIDatasetBuilder(QualityGateConfig(ers_threshold=0.65, session_health_threshold=0.60, min_exchanges=5))
    result  = builder.build(signals)

    print(f"Total conversations processed : {result.total_conversations}")
    print(f"Passed quality gate (eligible): {result.eligible}  ({result.quality_stats['pass_rate']:.1%})")
    print(f"Excluded                      : {result.excluded}")

    print("\nExclusion breakdown:")
    for reason, count in result.exclusion_breakdown.items():
        print(f"  {reason:<20}: {count}")

    print("\nEligible dataset quality stats:")
    for k, v in result.quality_stats.items():
        print(f"  {k:<25}: {v}")

    print("\nSample training record (JSONL preview):")
    sample = builder.to_jsonl(result.training_records[:1])
    parsed = json.loads(sample)
    print(json.dumps(parsed, indent=2)[:600] + "\n  ...")

    # Category breakdown of training data
    cat_counts: dict[str, int] = {}
    for r in result.training_records:
        c = r.metadata["category"]
        cat_counts[c] = cat_counts.get(c, 0) + 1
    print("\nTraining records by category:")
    for cat, n in sorted(cat_counts.items(), key=lambda x: -x[1]):
        share = n / max(1, result.eligible)
        bar = "█" * int(share * 30)
        print(f"  {cat:<22} {n:>4}  {share:.1%}  {bar}")

    print(f"\nTotal training pairs ready for fine-tuning: {result.eligible}")
    print("Compatible with: OpenAI fine-tuning API, HuggingFace datasets, Axolotl, LLaMA-Factory")


if __name__ == "__main__":
    main()
