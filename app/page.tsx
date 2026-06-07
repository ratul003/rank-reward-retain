'use client'

import React, { useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────────
const VIOLET = '#8b5cf6'
const BG     = '#0a0a0f'

// ── Helpers ────────────────────────────────────────────────────────────────────
function AnimatedMetric({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, color: VIOLET, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: 6, fontWeight: 600 }}>{label}</div>
      {note && <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>{note}</div>}
    </div>
  )
}

// ── Section nav ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'problem',  label: 'Problem' },
  { id: 'rank',     label: 'Rank' },
  { id: 'reward',   label: 'Reward' },
  { id: 'retain',   label: 'Retain' },
  { id: 'joy',      label: 'Joy AI' },
  { id: 'outcomes', label: 'Outcomes' },
]

function SectionNav() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: VIOLET, letterSpacing: '0.05em' }}>RANK · REWARD · RETAIN</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {NAV_ITEMS.map(n => (
            <button key={n.id} onClick={() => scrollTo(n.id)}
              style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'transparent', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = VIOLET)}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

// ── TOPSIS engine ──────────────────────────────────────────────────────────────
const CRITERIA = [
  { name: 'CSAT',            type: 'benefit', weight: 0.30, icon: '★' },
  { name: 'Session Count',   type: 'benefit', weight: 0.25, icon: '◎' },
  { name: 'Retention Rate',  type: 'benefit', weight: 0.20, icon: '↩' },
  { name: 'Response Time',   type: 'cost',    weight: 0.15, icon: '⏱' },
  { name: 'Credential Tier', type: 'benefit', weight: 0.10, icon: '✓' },
]

const SAMPLE_EXPERTS = [
  { name: 'Arjun S.',  csat: 4.8, sessions: 142, retention: 0.73, responseTime: 4.2, credTier: 3 },
  { name: 'Priya M.',  csat: 4.1, sessions: 89,  retention: 0.61, responseTime: 7.5, credTier: 4 },
  { name: 'Zara K.',   csat: 3.9, sessions: 210, retention: 0.55, responseTime: 3.8, credTier: 2 },
  { name: 'Amir H.',   csat: 4.5, sessions: 56,  retention: 0.82, responseTime: 9.1, credTier: 5 },
  { name: 'Nadia R.',  csat: 3.4, sessions: 178, retention: 0.44, responseTime: 5.3, credTier: 2 },
]

function computeTopsis(experts: typeof SAMPLE_EXPERTS) {
  const raw  = experts.map(e => [e.csat, e.sessions, e.retention, e.responseTime, e.credTier])
  const norms = CRITERIA.map((_, j) => Math.sqrt(raw.reduce((s, r) => s + r[j] ** 2, 0)))
  const R    = raw.map(r => r.map((v, j) => v / (norms[j] || 1)))
  const V    = R.map(r => r.map((v, j) => v * CRITERIA[j].weight))
  const Apos = CRITERIA.map((c, j) =>
    c.type === 'benefit' ? Math.max(...V.map(r => r[j])) : Math.min(...V.map(r => r[j]))
  )
  const Aneg = CRITERIA.map((c, j) =>
    c.type === 'benefit' ? Math.min(...V.map(r => r[j])) : Math.max(...V.map(r => r[j]))
  )
  const dPos = V.map(r => Math.sqrt(r.reduce((s, v, j) => s + (v - Apos[j]) ** 2, 0)))
  const dNeg = V.map(r => Math.sqrt(r.reduce((s, v, j) => s + (v - Aneg[j]) ** 2, 0)))
  const ers  = dPos.map((d, i) => dNeg[i] / (d + dNeg[i]))
  const order = ers.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s)
  return { R, V, Apos, Aneg, dPos, dNeg, ers, order }
}

// ── TopsisWalkthrough ──────────────────────────────────────────────────────────
type TopsisStep = 'raw' | 'normalised' | 'weighted' | 'ideal' | 'ers'

function TopsisWalkthrough() {
  const [step, setStep] = useState<TopsisStep>('raw')
  const { R, V, Apos, Aneg, dPos, dNeg, ers, order } = computeTopsis(SAMPLE_EXPERTS)

  const steps: { id: TopsisStep; label: string; desc: string }[] = [
    { id: 'raw',        label: '1. Raw scores',     desc: 'Each expert\'s five criterion values as measured. Scales differ — CSAT is 1-5, sessions is 0-300, response time is in minutes.' },
    { id: 'normalised', label: '2. Normalised',      desc: 'Euclidean normalisation brings all criteria to a common scale without distortion. Each column divides by its vector magnitude.' },
    { id: 'weighted',   label: '3. Weighted',        desc: 'Multiply each normalised value by its criterion weight. CSAT (0.30) contributes more than Credential Tier (0.10).' },
    { id: 'ideal',      label: '4. Ideal solutions', desc: 'Positive ideal A+: best possible value per criterion. Negative ideal A-: worst. Response Time flips because lower is better.' },
    { id: 'ers',        label: '5. ERS ranking',     desc: 'Relative closeness: d- / (d+ + d-). Closer to 1 means closer to the ideal expert profile across all five criteria simultaneously.' },
  ]

  const rawVal = (expIdx: number, critIdx: number): string => {
    const keys = ['csat','sessions','retention','responseTime','credTier'] as const
    const v = SAMPLE_EXPERTS[expIdx][keys[critIdx]]
    return typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v)
  }

  const cellVal = (expIdx: number, critIdx: number): string => {
    if (step === 'raw')        return rawVal(expIdx, critIdx)
    if (step === 'normalised') return R[expIdx][critIdx].toFixed(3)
    if (step === 'weighted')   return V[expIdx][critIdx].toFixed(4)
    return ''
  }

  const currentStep = steps.find(s => s.id === step)!

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>TOPSIS algorithm, step by step — click through to see what changes</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {steps.map(s => (
          <button key={s.id} onClick={() => setStep(s.id)} style={{
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600,
            border: `2px solid ${step === s.id ? VIOLET : 'rgba(255,255,255,0.08)'}`,
            background: step === s.id ? `${VIOLET}18` : 'rgba(255,255,255,0.02)',
            color: step === s.id ? VIOLET : '#64748b', transition: 'all 0.15s',
          }}>{s.label}</button>
        ))}
      </div>
      <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 20, padding: '12px 14px', background: `${VIOLET}08`, border: `1px solid ${VIOLET}20`, borderRadius: 10 }}>
        {currentStep.desc}
      </div>

      {(step === 'raw' || step === 'normalised' || step === 'weighted') && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Expert</th>
                {CRITERIA.map(c => (
                  <th key={c.name} style={{ textAlign: 'right', padding: '8px 10px', color: c.type === 'cost' ? '#f59e0b' : '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.72rem' }}>
                    {c.icon} {c.name}{c.type === 'cost' ? ' ↓' : ''}
                    <div style={{ fontSize: '0.62rem', color: '#334155', fontWeight: 400 }}>w={c.weight}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_EXPERTS.map((e, i) => (
                <tr key={e.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '9px 12px', color: '#e2e8f0', fontWeight: 600 }}>{e.name}</td>
                  {CRITERIA.map((_, j) => (
                    <td key={j} style={{ padding: '9px 10px', textAlign: 'right', color: VIOLET, fontFamily: 'monospace' }}>{cellVal(i, j)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {step === 'ideal' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Solution</th>
                {CRITERIA.map(c => (
                  <th key={c.name} style={{ textAlign: 'right', padding: '8px 10px', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.72rem' }}>
                    {c.icon} {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '9px 12px', color: '#22c55e', fontWeight: 700 }}>A+ (Positive Ideal)</td>
                {Apos.map((v, j) => (
                  <td key={j} style={{ padding: '9px 10px', textAlign: 'right', color: '#22c55e', fontFamily: 'monospace' }}>{v.toFixed(4)}</td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '9px 12px', color: '#ef4444', fontWeight: 700 }}>A- (Negative Ideal)</td>
                {Aneg.map((v, j) => (
                  <td key={j} style={{ padding: '9px 10px', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace' }}>{v.toFixed(4)}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 14, fontSize: '0.76rem', color: '#64748b' }}>
            Response Time is a cost criterion. Its A+ (best) is the lowest weighted value; A- (worst) is the highest. The direction flips here.
          </div>
        </div>
      )}

      {step === 'ers' && (
        <div>
          {order.map(({ s: score, i: expIdx }, rank) => {
            const e = SAMPLE_EXPERTS[expIdx]
            return (
              <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: rank === 0 ? VIOLET : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: rank === 0 ? 'white' : '#475569', flexShrink: 0 }}>{rank + 1}</div>
                <div style={{ width: 80, fontSize: '0.78rem', color: '#e2e8f0', fontWeight: rank === 0 ? 700 : 400, flexShrink: 0 }}>{e.name}</div>
                <div style={{ flex: 1, height: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: `${score * 100}%`, height: '100%', background: VIOLET, opacity: 0.55 - rank * 0.06, borderRadius: 5 }} />
                  <div style={{ position: 'absolute', top: 0, right: 8, height: '100%', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{score.toFixed(4)}</span>
                  </div>
                </div>
                <div style={{ width: 70, fontSize: '0.68rem', color: '#334155' }}>d+={dPos[expIdx].toFixed(3)}</div>
                <div style={{ width: 70, fontSize: '0.68rem', color: '#334155' }}>d-={dNeg[expIdx].toFixed(3)}</div>
              </div>
            )
          })}
          <div style={{ marginTop: 12, padding: '12px 14px', background: `${VIOLET}08`, border: `1px solid ${VIOLET}20`, borderRadius: 10, fontSize: '0.76rem', color: '#94a3b8' }}>
            Arjun ranks #1 not by dominating any single criterion, but by being geometrically closest to the positive ideal across all five, weighted appropriately. Zara has more sessions, but her CSAT and retention pull her back.
          </div>
        </div>
      )}
    </div>
  )
}

// ── CredentialTierScale ────────────────────────────────────────────────────────
const TIERS = [
  { tier: 1, label: 'Identity Verified',  desc: 'Government ID confirmed. The minimum entry gate for all categories.', categories: 'All categories' },
  { tier: 2, label: 'Credentials Added',  desc: 'Relevant certifications or degrees uploaded and reviewed by the Coto team.', categories: 'All categories' },
  { tier: 3, label: 'Specialisation',     desc: 'Specialisation area verified, professional experience documented and cross-checked.', categories: 'Mental health, Reproductive, Financial' },
  { tier: 4, label: 'Background Checked', desc: 'Full background check passed, references verified, testimonials reviewed.', categories: 'Mental health, Reproductive' },
  { tier: 5, label: 'Institutional',      desc: 'Institutional affiliation confirmed. Highest trust signal on the platform.', categories: 'Mental health, Reproductive, Financial' },
]

function CredentialTierScale() {
  const [hov, setHov] = useState<number | null>(null)
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Credential Tier — ordinal KYC scale, hover each tier</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {TIERS.map((t, i) => {
          const isHov = hov === i
          return (
            <div key={t.tier} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{ flex: 1, background: isHov ? `${VIOLET}18` : `rgba(139,92,246,${0.04 + i * 0.03})`, border: `2px solid ${isHov ? VIOLET : `rgba(139,92,246,${0.15 + i * 0.08})`}`, borderRadius: 10, padding: '14px 10px', cursor: 'default', transition: 'all 0.15s', minHeight: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: VIOLET, opacity: 0.4 + i * 0.15 }}>{t.tier}</div>
              <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{t.label}</div>
            </div>
          )
        })}
      </div>
      {hov !== null && (
        <div style={{ marginTop: 12, padding: '14px 16px', background: `${VIOLET}08`, border: `1px solid ${VIOLET}22`, borderRadius: 10 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: VIOLET, marginBottom: 4 }}>Tier {TIERS[hov].tier}: {TIERS[hov].label}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 5 }}>{TIERS[hov].desc}</div>
          <div style={{ fontSize: '0.7rem', color: '#475569' }}>Applied to: {TIERS[hov].categories}</div>
        </div>
      )}
    </div>
  )
}

// ── ERSScorecard ───────────────────────────────────────────────────────────────
function ERSScorecard() {
  const [selected, setSelected] = useState(0)
  const { V, Apos, Aneg, dPos, dNeg, ers, order } = computeTopsis(SAMPLE_EXPERTS)
  const ranked = order.map(o => ({ ...SAMPLE_EXPERTS[o.i], ers: o.s, origIdx: o.i }))
  const expert = ranked[selected]
  const origIdx = expert.origIdx

  const breakdown = CRITERIA.map((c, j) => {
    const colMax = Math.max(...V.map(r => r[j]))
    return { ...c, raw: [expert.csat, expert.sessions, expert.retention, expert.responseTime, expert.credTier][j], weighted: V[origIdx][j], colMax }
  })

  const aiGate = expert.ers >= 0.65

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Expert scorecard — select an expert to see their full ERS breakdown</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {ranked.map((e, i) => (
          <button key={e.name} onClick={() => setSelected(i)} style={{
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem',
            border: `2px solid ${selected === i ? VIOLET : 'rgba(255,255,255,0.08)'}`,
            background: selected === i ? `${VIOLET}15` : 'rgba(255,255,255,0.02)',
            color: selected === i ? VIOLET : '#64748b', transition: 'all 0.15s',
          }}>
            #{i + 1} {e.name}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${VIOLET}18`, border: `2px solid ${VIOLET}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: VIOLET }}>
              {expert.ers.toFixed(2)}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>{expert.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ERS rank #{selected + 1} of {ranked.length}</div>
              <div style={{ fontSize: '0.7rem', color: aiGate ? '#22c55e' : '#ef4444', fontWeight: 600, marginTop: 2 }}>
                {aiGate ? '✓ AI training eligible (ERS ≥ 0.65)' : '✗ Below AI training threshold'}
              </div>
            </div>
          </div>
          {breakdown.map(c => {
            const pct = c.colMax > 0 ? (c.weighted / c.colMax) * 100 : 0
            return (
              <div key={c.name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.72rem', color: c.type === 'cost' ? '#f59e0b' : '#94a3b8' }}>{c.icon} {c.name} <span style={{ color: '#334155' }}>w={c.weight}</span></span>
                  <span style={{ fontSize: '0.72rem', color: VIOLET, fontFamily: 'monospace' }}>{typeof c.raw === 'number' ? c.raw.toFixed(2) : c.raw}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: c.type === 'cost' ? '#f59e0b' : VIOLET, opacity: 0.7, borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
            )
          })}
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Distance from ideal</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.78rem', color: '#22c55e' }}>d+ (from best)</span>
              <span style={{ fontSize: '0.78rem', color: '#22c55e', fontFamily: 'monospace' }}>{dPos[origIdx].toFixed(4)}</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, dPos[origIdx] / 0.15 * 100)}%`, background: '#22c55e', opacity: 0.5, borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>d- (from worst)</span>
              <span style={{ fontSize: '0.78rem', color: '#ef4444', fontFamily: 'monospace' }}>{dNeg[origIdx].toFixed(4)}</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, dNeg[origIdx] / 0.15 * 100)}%`, background: '#ef4444', opacity: 0.5, borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ padding: '14px', background: `${VIOLET}08`, border: `1px solid ${VIOLET}20`, borderRadius: 10 }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 6 }}>ERS = d- / (d+ + d-)</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: VIOLET }}>
              = {dNeg[origIdx].toFixed(4)} / ({dPos[origIdx].toFixed(4)} + {dNeg[origIdx].toFixed(4)})
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: VIOLET, fontWeight: 700, marginTop: 6 }}>
              = {expert.ers.toFixed(4)}
            </div>
          </div>
          {selected > 0 && (
            <div style={{ marginTop: 14, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.6 }}>
              Gap to #1: {(ranked[0].ers - expert.ers).toFixed(4)} ERS points. Biggest room for improvement is in the highest-weighted criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── RevenueShareBuilder ────────────────────────────────────────────────────────
const MULTIPLIERS = [
  { key: 'cat_legal',  label: 'Legal / Finance',             value: 0.20, group: 'Category',      color: '#06b6d4' },
  { key: 'cat_mh',     label: 'Mental Health / Relationship',value: 0.15, group: 'Category',      color: '#06b6d4' },
  { key: 'reg_mena',   label: 'MENA or SEA region',          value: 0.10, group: 'Region',        color: '#22c55e' },
  { key: 'time_late',  label: 'Late night (11pm - 4am)',      value: 0.15, group: 'Time Band',     color: '#f59e0b' },
  { key: 'vol_30',     label: '30+ sessions in 90 days',     value: 0.10, group: 'Volume',        color: '#3b82f6' },
  { key: 'cert_4mo',   label: 'Certified within 4 months',   value: 0.15, group: 'Certification', color: '#ec4899' },
  { key: 'excl_3mo',   label: 'Exclusive contract (3 mo)',   value: 0.25, group: 'Exclusivity',   color: VIOLET   },
  { key: 'perf_mile',  label: 'CSAT ≥ 4.5 + retention ≥ 70%', value: 0.05, group: 'Performance', color: '#64748b' },
]

function RevenueShareBuilder() {
  const [base, setBase] = useState(0.30)
  const [active, setActive] = useState<Set<string>>(new Set(['cat_mh', 'reg_mena', 'time_late', 'excl_3mo']))

  const toggle = (key: string) => setActive(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  const added  = MULTIPLIERS.filter(m => active.has(m.key)).reduce((s, m) => s + m.value, 0)
  const total  = Math.min(0.90, base + added)
  const uncapped = base + added

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 20 }}>Build an expert&apos;s revenue share — toggle any combination</div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Base rate (negotiated at onboarding)</span>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: VIOLET }}>{Math.round(base * 100)}%</span>
        </div>
        <input type="range" min={30} max={70} step={5} value={base * 100}
          onChange={e => setBase(parseInt(e.target.value) / 100)}
          style={{ width: '100%', accentColor: VIOLET, cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#334155', marginTop: 4 }}>
          <span>30% — new expert</span><span>70% — senior partner</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {MULTIPLIERS.map(m => {
          const on = active.has(m.key)
          return (
            <button key={m.key} onClick={() => toggle(m.key)} style={{
              padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.76rem',
              border: `2px solid ${on ? m.color : 'rgba(255,255,255,0.08)'}`,
              background: on ? `${m.color}18` : 'rgba(255,255,255,0.02)',
              color: on ? m.color : '#475569', transition: 'all 0.15s', fontWeight: on ? 700 : 400,
            }}>
              {m.label} <span style={{ opacity: 0.8 }}>+{Math.round(m.value * 100)}%</span>
            </button>
          )
        })}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Total revenue share</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {uncapped > 0.90 && <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>90% cap applied</span>}
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: VIOLET, letterSpacing: '-0.02em' }}>{Math.round(total * 100)}%</span>
          </div>
        </div>
        <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${total * 100}%`, background: `linear-gradient(90deg, ${VIOLET}, #06b6d4)`, borderRadius: 6, transition: 'width 0.35s' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[10, 20, 40].map(s => (
          <div key={s} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{s} sessions/mo</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: VIOLET }}>₹{(s * 500 * total).toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: 2 }}>est. monthly earnings</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ConversionFunnel ───────────────────────────────────────────────────────────
const FUNNEL_STAGES = [
  { label: 'Downloads',        n: 12400 },
  { label: 'Sign-ups',         n: 5890  },
  { label: 'Sessions Started', n: 3560  },
  { label: 'Transactions',     n: 2190  },
]
const CHURN_POINTS = [
  { label: 'Expert Reviews Churn',        n: 320, color: '#ef4444', desc: 'Users leaving after reading expert profiles, low ratings, or sparse reviews.' },
  { label: 'Expert Unavailability Churn', n: 580, color: '#f59e0b', desc: 'Users bouncing when no expert is available in their category and time window.' },
  { label: 'Payment Page Churn',          n: 210, color: '#f97316', desc: 'Users who reached the payment screen but abandoned before completing.' },
]

function ConversionFunnel() {
  const [hov, setHov] = useState<number | null>(null)
  const maxN = FUNNEL_STAGES[0].n

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 20 }}>Conversion funnel with churn attribution — hover the right panel</div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          {FUNNEL_STAGES.map((stage, i) => {
            const pct = stage.n / maxN * 100
            const next = FUNNEL_STAGES[i + 1]
            const cr   = next ? Math.round(next.n / stage.n * 100) : null
            const drop = next ? stage.n - next.n : null
            return (
              <div key={stage.label} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: cr !== null ? 3 : 0 }}>
                  <div style={{ width: 100, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{stage.label}</div>
                  <div style={{ flex: 1, height: 36, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: `${pct}%`, height: '100%', background: VIOLET, opacity: 0.55 - i * 0.10, borderRadius: 5 }} />
                    <div style={{ position: 'absolute', top: 0, left: 10, height: '100%', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: '#0a0a0f', fontWeight: 700 }}>{stage.n.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {cr !== null && drop !== null && (
                  <div style={{ textAlign: 'right', fontSize: '0.66rem', color: '#475569', marginBottom: 4 }}>
                    {cr}% conversion · {drop.toLocaleString()} dropped
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ width: 230 }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Where customers leave</div>
          {CHURN_POINTS.map((cp, i) => (
            <div key={cp.label} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{ marginBottom: 8, padding: '12px 14px', background: hov === i ? `${cp.color}10` : 'rgba(255,255,255,0.02)', border: `1px solid ${hov === i ? cp.color + '40' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, cursor: 'default', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '0.78rem', color: cp.color, fontWeight: 700, marginBottom: 3 }}>{cp.n} users</div>
              <div style={{ fontSize: '0.68rem', color: hov === i ? '#94a3b8' : '#475569', lineHeight: 1.5 }}>
                {hov === i ? cp.desc : cp.label}
              </div>
            </div>
          ))}
          <div style={{ padding: '10px 14px', background: `${VIOLET}08`, border: `1px solid ${VIOLET}20`, borderRadius: 10 }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 3 }}>Overall conversion</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: VIOLET }}>17.7%</div>
            <div style={{ fontSize: '0.68rem', color: '#334155' }}>download to transaction</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CreatorMetricGrid ──────────────────────────────────────────────────────────
const CREATOR_METRICS = [
  { module: 'Performance', color: VIOLET,    metrics: ['Total Followers', 'Total Sessions', 'Total Reshares', 'Total Reviews', 'Total Likes', 'Total Love Reacts', 'Views / Impressions', 'Subscribers / Paid Customers'] },
  { module: 'Sessions',    color: '#06b6d4', metrics: ['Total Attendees', 'Total Comments', 'Questions / Polls', 'Returning Viewers', 'Avg Session Time', 'No Shows', 'Dropout Users', 'Session Utilization', 'Retention Rate', 'Poll Re-engagement', 'Feedback Re-engagement', 'CSAT (1-5)', 'Creator Waiting Time'] },
  { module: 'Revenue',     color: '#22c55e', metrics: ['Total Earnings', 'Earnings by Session Type', 'Revenue Share Breakdown', 'ARPU', 'Revenue by Category', 'Avg Revenue per Session', 'Revenue per Expert', 'Customer LTV', 'Churn per Day', 'Refund per Day', 'Upsell Deals', 'Cross-sell Deals', 'Customer Retention Rate', 'LTV-to-CAC', 'Revenue by Region', 'Time to Payback', 'Freemium Conversion Rate'] },
  { module: 'Conversion',  color: '#f59e0b', metrics: ['Service Conversion', 'Click Through Rate', 'Download to Sign-up', 'Total Sign-ups', 'Total Downloads', 'Sign-up to Session', 'Transaction Volume', 'Expert Reviews Churn', 'Expert Unavailability Churn', 'Payment Page Churn'] },
]

function CreatorMetricGrid() {
  const [active, setActive] = useState('Performance')
  const mod = CREATOR_METRICS.find(m => m.module === active)!

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {CREATOR_METRICS.map(m => {
          const on = active === m.module
          return (
            <button key={m.module} onClick={() => setActive(m.module)} style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              border: `2px solid ${on ? m.color : 'rgba(255,255,255,0.08)'}`,
              background: on ? `${m.color}15` : 'rgba(255,255,255,0.02)',
              color: on ? m.color : '#64748b', transition: 'all 0.15s',
            }}>
              {m.module} <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>({m.metrics.length})</span>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {mod.metrics.map((metric, i) => (
          <div key={metric} style={{ padding: '12px 14px', background: `${mod.color}08`, border: `1px solid ${mod.color}20`, borderRadius: 9 }}>
            <div style={{ fontSize: '0.65rem', color: '#334155', marginBottom: 3 }}>#{i + 1}</div>
            <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 500 }}>{metric}</div>
            <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: 3 }}>WoW + MoM delta</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AIQualityGate ──────────────────────────────────────────────────────────────
const GATE_STAGES = [
  { label: 'Raw conversations',        n: 500, color: '#64748b', icon: '💬' },
  { label: 'ERS ≥ 0.65',               n: 320, color: VIOLET,    icon: '⭐' },
  { label: 'Session health ≥ 0.60',   n: 270, color: '#06b6d4', icon: '✓' },
  { label: 'Min 5 exchanges',          n: 248, color: '#22c55e', icon: '📋' },
  { label: 'Fine-tuning dataset',      n: 248, color: '#22c55e', icon: '🤖' },
]

function AIQualityGate() {
  const max = GATE_STAGES[0].n
  return (
    <div style={{ marginTop: 28, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 20 }}>ERS quality gate — how conversations earned entry into Joy&apos;s training set</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GATE_STAGES.map((stage, i) => {
          const pct    = stage.n / max * 100
          const prev   = i > 0 ? GATE_STAGES[i - 1].n : stage.n
          const dropoff = prev - stage.n
          return (
            <div key={stage.label}>
              {i > 0 && dropoff > 0 && (
                <div style={{ fontSize: '0.65rem', color: '#334155', textAlign: 'right', marginBottom: 3, paddingRight: `${100 - (GATE_STAGES[i-1].n / max * 100)}%` }}>
                  {dropoff} excluded by this gate
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{stage.icon}</span>
                <div style={{ width: 190, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{stage.label}</div>
                <div style={{ flex: 1, height: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: `${pct}%`, height: '100%', background: stage.color, opacity: 0.55, borderRadius: 5 }} />
                  <div style={{ position: 'absolute', top: 0, left: 10, height: '100%', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#0a0a0f', fontWeight: 700 }}>{stage.n}</span>
                  </div>
                  <div style={{ position: 'absolute', top: 0, right: 8, height: '100%', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{Math.round(pct)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 20, padding: '14px 16px', background: `${VIOLET}08`, border: `1px solid ${VIOLET}20`, borderRadius: 10 }}>
        <div style={{ fontSize: '0.8rem', color: VIOLET, fontWeight: 700, marginBottom: 4 }}>49.6% pass rate, by design</div>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          The gate is deliberately strict. One low-quality expert conversation in the training set degrades Joy for every user who encounters it afterward. 248 high-quality pairs beat 500 mediocre ones, and the ERS score is what makes the gate principled rather than arbitrary.
        </p>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e2e8f0' }}>
      <SectionNav />

      {/* ── Hero ── */}
      <section id="problem" style={{ padding: '80px 32px 100px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${VIOLET}12, transparent)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: VIOLET }} />
            <span style={{ fontSize: '0.72rem', color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Project 6 · Coto, Singapore 2024</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 24, color: '#f8fafc' }}>
            Rank, Reward, Retain
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#94a3b8', lineHeight: 1.75, maxWidth: 680, marginBottom: 48 }}>
            Coto had experts but no intelligence about them. No quality signal, no principled compensation model, no analytics to track performance. I built all three from scratch: a TOPSIS scoring system, a dynamic revenue framework, and a creator analytics dashboard, delivered before the engineering team had capacity to ship anything.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, maxWidth: 680, marginBottom: 48 }}>
            <AnimatedMetric value="23%"  label="Quality improvement"    note="after ERS implementation" />
            <AnimatedMetric value="95%"  label="Supply retention"        note="from revenue framework" />
            <AnimatedMetric value="300+" label="Verified experts"         note="across 5 categories" />
            <AnimatedMetric value="3M+"  label="Consultations via Joy"   note="quality-gated by ERS" />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['Python · NumPy · SciPy', 'TOPSIS MCDA', 'Google Sheets', 'dbt · PostgreSQL', 'NLP Pipeline', 'Segment-compatible events'].map(tag => (
              <span key={tag} style={{ padding: '6px 12px', borderRadius: 6, background: `${VIOLET}10`, border: `1px solid ${VIOLET}22`, fontSize: '0.76rem', color: '#94a3b8' }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three Arcs ── */}
      <section style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Three problems, one framework</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 700, marginBottom: 40 }}>
            Supply-side intelligence has three distinct layers. If you only solve one, the others collapse. A score without compensation means experts don&apos;t care about their ranking. Compensation without analytics means you can&apos;t tell whether any of it is working.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { arc: 'Rank',   icon: '◆', color: VIOLET,    problem: 'Who are your best experts?',       solution: 'TOPSIS Expert Readiness Score. Five criteria, weighted multi-criteria analysis, interpretable per-expert breakdown. Not a black box, and not a naive weighted average.' },
              { arc: 'Reward', icon: '◇', color: '#06b6d4', problem: 'Why would experts prioritise you?', solution: 'Multi-factor revenue share, base 30-90%, with seven additive multipliers across category, region, time band, volume, certification, exclusivity, and performance.' },
              { arc: 'Retain', icon: '○', color: '#22c55e', problem: 'How do you know if it\'s working?', solution: '48 metrics across four modules: performance, session quality, revenue, and conversion funnel, with churn attribution at every drop-off stage.' },
            ].map(a => (
              <div key={a.arc} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${a.color}20`, borderRadius: 16, padding: '28px' }}>
                <div style={{ fontSize: '1.8rem', color: a.color, marginBottom: 16 }}>{a.icon}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: a.color, marginBottom: 10 }}>{a.arc}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: 10 }}>{a.problem}</div>
                <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{a.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ch01: Rank ── */}
      <section id="rank" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${VIOLET}10`, border: `1px solid ${VIOLET}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: VIOLET, fontWeight: 700, letterSpacing: '0.1em' }}>CH01</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>RANK</span>
          </div>

          {/* Narrative */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 36px', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: `linear-gradient(${VIOLET}, #06b6d4)` }} />
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>The quality problem, circa 2024</div>
            <p style={{ fontSize: '1rem', color: '#e2e8f0', lineHeight: 1.8, marginBottom: 16, fontStyle: 'italic' }}>
              Coto had hundreds of experts. They had no idea which ones were actually good.
            </p>
            <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.8, marginBottom: 16 }}>
              CSAT scores existed but weren&apos;t aggregated meaningfully. Session counts were tracked but not weighted against quality. Response time data was in the logs but nobody was joining it to anything. The platform was routing customers to experts based on availability alone, not suitability.
            </p>
            <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.8, margin: 0 }}>
              I needed a scoring system that was interpretable enough for operators to trust, rigorous enough to not be gamed, and flexible enough to adapt to five different wellness categories, each with different quality norms and tolerance thresholds.
            </p>
          </div>

          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Why TOPSIS, not a weighted average</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 32 }}>
            A naive weighted average is gameable. An expert can inflate session count while CSAT quietly declines, and their score stays flat. TOPSIS evaluates each expert against the best and worst possible profiles simultaneously, so gaming one criterion pulls back the others. It also handles genuinely conflicting signals, like high volume but slow response time, without collapsing them into noise.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 40 }}>
            {CRITERIA.map(c => (
              <div key={c.name} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.type === 'cost' ? '#f59e0b22' : `${VIOLET}20`}`, borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8, color: c.type === 'cost' ? '#f59e0b' : VIOLET }}>{c.icon}</div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: c.type === 'cost' ? '#f59e0b' : VIOLET }}>{Math.round(c.weight * 100)}%</div>
                <div style={{ fontSize: '0.62rem', color: '#334155', marginTop: 3 }}>{c.type === 'cost' ? 'cost (↓ better)' : 'benefit (↑ better)'}</div>
              </div>
            ))}
          </div>

          <TopsisWalkthrough />
          <CredentialTierScale />
          <ERSScorecard />

          <div style={{ marginTop: 28, padding: '18px 22px', background: `${VIOLET}06`, border: `1px solid ${VIOLET}18`, borderRadius: 12 }}>
            <div style={{ fontSize: '0.68rem', color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Design decision: not a black box</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
              Every ERS output includes a per-criterion breakdown. Operators can see exactly why Expert A outranks Expert B and which criterion is the gap. That interpretability matters: a score that ops can&apos;t explain cannot drive decisions about routing, training, or compensation.
            </p>
          </div>
        </div>
      </section>

      {/* ── Ch02: Reward ── */}
      <section id="reward" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${VIOLET}10`, border: `1px solid ${VIOLET}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: VIOLET, fontWeight: 700, letterSpacing: '0.1em' }}>CH02</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>REWARD</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Dynamic Revenue Optimization Framework</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 40 }}>
            A flat commission splits incentive evenly across all experts and all hours. That&apos;s not what a marketplace needs. Coto needed supply in the right categories, the right regions, the right time bands. The revenue share model is how you steer supply without a scheduling manager working round the clock.
          </p>

          {/* Worked example */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px', marginBottom: 36 }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Worked example from the project</div>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 20, lineHeight: 1.65 }}>
              Indian mental health expert. Late night sessions. MENA users. Exclusive contract signed within 3 months of onboarding.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Base',             value: '30%',  color: '#64748b', active: true },
                { label: 'Mental Health',    value: '+15%', color: '#06b6d4', active: true },
                { label: 'MENA Region',      value: '+10%', color: '#22c55e', active: true },
                { label: 'Late Night',       value: '+15%', color: '#f59e0b', active: true },
                { label: 'Volume (20/mo)',   value: '+0%',  color: '#334155', active: false },
                { label: 'Exclusive (3mo)', value: '+10%', color: VIOLET,    active: true },
              ].map(item => (
                <div key={item.label} style={{ padding: '12px 14px', background: item.active ? `${item.color}10` : 'rgba(255,255,255,0.02)', border: `1px solid ${item.active ? item.color + '30' : 'rgba(255,255,255,0.05)'}`, borderRadius: 10, opacity: item.active ? 1 : 0.4 }}>
                  <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: item.active ? item.color : '#334155' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: `${VIOLET}10`, border: `1px solid ${VIOLET}25`, borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 2 }}>Total revenue share</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: VIOLET, letterSpacing: '-0.02em' }}>70%</div>
              </div>
              <div style={{ flex: 1, fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6 }}>
                On 20 sessions/month at ₹500 average fee, that&apos;s ₹7,000/month earned. The incentive to take late-night sessions in a high-demand region is built directly into the number, not an ops team&apos;s Slack message.
              </div>
            </div>
          </div>

          <RevenueShareBuilder />

          {/* Early Bird packages */}
          <div style={{ marginTop: 28, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 28px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Early Bird Incentive Packages</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 20 }}>
              The revenue share model works at scale. But to launch, you need supply before demand arrives. I designed early bird packages to bring experts on fast, with a 90% revenue share guaranteed for the first 18 months to lock in commitment.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { pkg: 'Astrology Pioneer',     rev: '75%', guarantee: '18 months', region: 'IN + MENA' },
                { pkg: 'Wellness First',         rev: '80%', guarantee: '18 months', region: 'SEA' },
                { pkg: 'Mental Health Anchor',   rev: '85%', guarantee: '18 months', region: 'IN + MENA + SEA' },
                { pkg: 'Finance Early Partner',  rev: '82%', guarantee: '18 months', region: 'MENA + SEA' },
                { pkg: 'Reproductive Pioneer',   rev: '85%', guarantee: '18 months', region: 'IN + MENA' },
                { pkg: 'Night Owl Bonus',         rev: '+15%', guarantee: 'Late night only', region: 'All regions' },
              ].map(p => (
                <div key={p.pkg} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${VIOLET}18`, borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{p.pkg}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: VIOLET }}>{p.rev}</div>
                  <div style={{ fontSize: '0.66rem', color: '#475569', marginTop: 3 }}>{p.guarantee} · {p.region}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Ch03: Retain ── */}
      <section id="retain" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${VIOLET}10`, border: `1px solid ${VIOLET}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: VIOLET, fontWeight: 700, letterSpacing: '0.1em' }}>CH03</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>RETAIN</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Creator Analytics Framework</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 12 }}>
            48 metrics across four modules, delivered as a working Google Sheets dashboard before any engineering was in place. The goal was a single weekly view that told an expert exactly where they stood, and told ops where the platform had gaps.
          </p>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 36 }}>
            Every metric is sliceable by creator, category, and region, with WoW and MoM deltas. An expert whose session count is growing but retention is dropping is a different problem from one whose numbers are flat across the board. That distinction drives different ops responses.
          </p>

          <CreatorMetricGrid />
          <ConversionFunnel />

          <div style={{ marginTop: 28, padding: '18px 22px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Delivered artifact</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
              Three-tab Google Sheets dashboard: Onboarding (creator profiles and KYC status), Demand and Supply (live matching metrics that link back to Project 5&apos;s barometer), and Revenue (earnings, share breakdown, LTV). Running before any analytics engineering was in place, because that&apos;s what the timeline demanded.
            </p>
          </div>
        </div>
      </section>

      {/* ── Ch04: Joy ── */}
      <section id="joy" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${VIOLET}10`, border: `1px solid ${VIOLET}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: VIOLET, fontWeight: 700, letterSpacing: '0.1em' }}>CH04</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>THE AI CONNECTION</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>How this data trained Joy</h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 720, marginBottom: 32 }}>
            Coto&apos;s AI companion was trained on 3M+ real expert conversations, but not all of them. The ERS scoring system became the quality gate for the AI training pipeline: only conversations from experts above the ERS threshold entered the fine-tuning dataset. Low-quality expert conversations were excluded before they could degrade the model.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${VIOLET}20`, borderRadius: 14, padding: '24px' }}>
              <div style={{ fontSize: '0.7rem', color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Quality gate thresholds</div>
              {[
                { label: 'ERS threshold',  value: '≥ 0.65', note: 'expert quality from TOPSIS' },
                { label: 'Session health', value: '≥ 0.60', note: 'resolution + sentiment arc' },
                { label: 'Min exchanges',  value: '5+',     note: 'enough signal to learn from' },
                { label: 'Sentiment arc',  value: 'positive', note: 'customer sentiment improved' },
              ].map(g => (
                <div key={g.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>{g.label}</div>
                    <div style={{ fontSize: '0.66rem', color: '#475569' }}>{g.note}</div>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: VIOLET }}>{g.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Signals extracted per conversation</div>
              {[
                { label: 'Topic classification', method: 'Zero-shot NLP' },
                { label: 'Sentiment arc',        method: 'Rolling VADER' },
                { label: 'Urgency score',        method: 'Embedding classifier' },
                { label: 'Resolution quality',   method: 'Conversation-end sentiment' },
                { label: 'Expertise signal',     method: 'Domain perplexity scoring' },
                { label: 'Session health',       method: 'Composite (weighted avg)' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{s.label}</span>
                  <span style={{ fontSize: '0.68rem', color: '#475569' }}>{s.method}</span>
                </div>
              ))}
            </div>
          </div>

          <AIQualityGate />

          <div style={{ marginTop: 28, padding: '20px 24px', background: `${VIOLET}06`, border: `1px solid ${VIOLET}22`, borderRadius: 12 }}>
            <div style={{ fontWeight: 700, color: VIOLET, fontSize: '0.9rem', marginBottom: 8 }}>The two projects are one system</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
              Project 5 handles real-time routing: during a Yellow state, high-ERS experts receive the incentive push first. Project 6 generates those ERS scores. Joy then learns from the conversations those high-ERS experts have. The scoring system, the ops layer, and the AI companion are the same pipeline seen from three different vantage points.
            </p>
          </div>
        </div>
      </section>

      {/* ── Ch05: Outcomes ── */}
      <section id="outcomes" style={{ padding: '0 32px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${VIOLET}10`, border: `1px solid ${VIOLET}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: VIOLET, fontWeight: 700, letterSpacing: '0.1em' }}>CH05</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>OUTCOMES</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 40 }}>What shipped, what moved</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 48 }}>
            {[
              { metric: '23%',  label: 'Expert quality rating improvement', note: 'After TOPSIS ERS replaced ad-hoc manual review, 23% lift in average quality ratings across the platform.' },
              { metric: '95%',  label: 'Supply retention rate',              note: 'The dynamic revenue framework produced 95% expert retention, well above the 60-70% industry norm.' },
              { metric: '300+', label: 'Verified experts onboarded',          note: 'Across five wellness categories, all scored, compensated, and tracked via the framework.' },
              { metric: '3M+',  label: 'Consultations via Joy',               note: 'Joy was trained on quality-gated expert conversations, the direct downstream of the ERS system.' },
            ].map(m => (
              <div key={m.metric} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${VIOLET}15`, borderRadius: 16, padding: '28px' }}>
                <div style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, color: VIOLET, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 10 }}>{m.metric}</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.55 }}>{m.note}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 28px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>Technical implementation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { layer: 'Scoring',      tools: ['Python 3.11', 'NumPy / SciPy', 'Pandas', 'TOPSIS (from scratch)', 'Configurable YAML presets'] },
                { layer: 'Analytics',    tools: ['dbt (staging + marts)', 'PostgreSQL schema', 'Segment-compatible events', 'Google Sheets dashboard', 'WoW / MoM delta models'] },
                { layer: 'AI Pipeline',  tools: ['NLP (zero-shot + VADER)', 'PII anonymisation layer', 'ERS quality gate', 'JSONL fine-tuning output', 'OpenAI / HuggingFace compatible'] },
              ].map(t => (
                <div key={t.layer}>
                  <div style={{ fontSize: '0.7rem', color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{t.layer}</div>
                  {t.tools.map(tool => (
                    <div key={tool} style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{tool}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '48px 32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Wahid Tawsif Ratul</div>
            <div style={{ fontSize: '0.72rem', color: '#475569' }}>Data Scientist · Product Manager</div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="https://github.com/ratul003/rank-reward-retain" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#64748b', textDecoration: 'none' }}>GitHub</a>
            <a href="https://www.linkedin.com/in/wahidtratul/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#64748b', textDecoration: 'none' }}>LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
