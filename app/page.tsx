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
    { id: 'raw',        label: '1. Raw scores',     desc: 'Each expert\'s five criterion values as measured. Scales differ: CSAT is 1-5, sessions is 0-300, response time is in minutes.' },
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
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>TOPSIS algorithm, step by step · click through to see what changes</div>
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
  { tier: 2, label: 'Credentials Added',  desc: 'Relevant certifications or degrees uploaded and reviewed by the platform team.', categories: 'All categories' },
  { tier: 3, label: 'Specialisation',     desc: 'Specialisation area verified, professional experience documented and cross-checked.', categories: 'Mental health, Reproductive, Financial' },
  { tier: 4, label: 'Background Checked', desc: 'Full background check passed, references verified, testimonials reviewed.', categories: 'Mental health, Reproductive' },
  { tier: 5, label: 'Institutional',      desc: 'Institutional affiliation confirmed. Highest trust signal on the platform.', categories: 'Mental health, Reproductive, Financial' },
]

function CredentialTierScale() {
  const [hov, setHov] = useState<number | null>(null)
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Credential Tier · ordinal KYC scale, hover each tier</div>
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
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Expert scorecard · select an expert to see their full ERS breakdown</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
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
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 20 }}>Build an expert&apos;s revenue share · toggle any combination</div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Base rate (negotiated at onboarding)</span>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: VIOLET }}>{Math.round(base * 100)}%</span>
        </div>
        <input type="range" min={30} max={70} step={5} value={base * 100}
          onChange={e => setBase(parseInt(e.target.value) / 100)}
          style={{ width: '100%', accentColor: VIOLET, cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#334155', marginTop: 4 }}>
          <span>30% · new expert</span><span>70% · senior partner</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {[10, 20, 40].map(s => (
          <div key={s} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{s} sessions/mo</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: VIOLET }}>${(s * 50 * total).toLocaleString()}</div>
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
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 20 }}>Conversion funnel with churn attribution · hover the right panel</div>
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
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 20 }}>ERS quality gate · how conversations earned entry into Joy&apos;s training set</div>
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

// ── WeightedAvgVsTopsis ────────────────────────────────────────────────────────
function computeWeightedAvg(experts: typeof SAMPLE_EXPERTS) {
  const maxSessions = Math.max(...experts.map(e => e.sessions))
  const minRT = Math.min(...experts.map(e => e.responseTime))
  const maxRT = Math.max(...experts.map(e => e.responseTime))
  return experts.map(e => {
    const csatN = (e.csat - 1) / 4
    const sessN = e.sessions / (maxSessions || 1)
    const retN  = e.retention
    const rtN   = 1 - (e.responseTime - minRT) / ((maxRT - minRT) || 1)
    const credN = (e.credTier - 1) / 4
    const score = 0.30 * csatN + 0.25 * sessN + 0.20 * retN + 0.15 * rtN + 0.10 * credN
    return { name: e.name, score }
  }).sort((a, b) => b.score - a.score)
}

function WeightedAvgVsTopsis() {
  const waRanked = computeWeightedAvg(SAMPLE_EXPERTS)
  const { order } = computeTopsis(SAMPLE_EXPERTS)
  const topsisRanked = order.map(o => ({ name: SAMPLE_EXPERTS[o.i].name, score: o.s }))
  const rankColor = (r: number) => r === 0 ? VIOLET : r === 1 ? '#06b6d4' : r === 4 ? '#ef4444' : '#64748b'
  const zaraWA     = waRanked.findIndex(e => e.name === 'Zara K.')
  const zaraTopsis = topsisRanked.findIndex(e => e.name === 'Zara K.')
  const amirWA     = waRanked.findIndex(e => e.name === 'Amir H.')
  const amirTopsis = topsisRanked.findIndex(e => e.name === 'Amir H.')

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>The case against a weighted average</div>
      <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 24, maxWidth: 680 }}>
        Same five experts. Same weights. Two methods. The rankings diverge, and that gap is where platform quality either compounds or quietly decays.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Naive Weighted Average</div>
          {waRanked.map((e, rank) => (
            <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${rankColor(rank)}22`, border: `1.5px solid ${rankColor(rank)}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: rankColor(rank), flexShrink: 0 }}>{rank + 1}</div>
              <div style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: `${e.score * 100}%`, height: '100%', background: e.name === 'Zara K.' ? '#f59e0b' : rankColor(rank), opacity: 0.4, borderRadius: 5 }} />
                <div style={{ position: 'absolute', top: 0, left: 10, height: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: e.name === 'Zara K.' ? '#f59e0b' : '#e2e8f0' }}>{e.name}</span>
                  {e.name === 'Zara K.' && <span style={{ fontSize: '0.62rem', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', borderRadius: 4, padding: '1px 5px' }}>sessions inflate</span>}
                </div>
                <div style={{ position: 'absolute', right: 8, top: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>{e.score.toFixed(3)}</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 8, fontSize: '0.72rem', color: '#f59e0b', lineHeight: 1.55 }}>
            Zara ranks #{zaraWA + 1}. Her 210 sessions drive 25% of the score. CSAT 3.9, retention 55%. The average cannot see the imbalance.
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: VIOLET, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>TOPSIS (Expert Readiness Score)</div>
          {topsisRanked.map((e, rank) => (
            <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${rankColor(rank)}22`, border: `1.5px solid ${rankColor(rank)}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: rankColor(rank), flexShrink: 0 }}>{rank + 1}</div>
              <div style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: `${e.score * 100}%`, height: '100%', background: e.name === 'Zara K.' ? '#ef4444' : rankColor(rank), opacity: e.name === 'Zara K.' ? 0.35 : 0.5, borderRadius: 5 }} />
                <div style={{ position: 'absolute', top: 0, left: 10, height: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: e.name === 'Zara K.' ? '#ef4444' : '#e2e8f0' }}>{e.name}</span>
                  {e.name === 'Zara K.' && <span style={{ fontSize: '0.62rem', color: '#ef4444', background: 'rgba(239,68,68,0.10)', borderRadius: 4, padding: '1px 5px' }}>quality drag caught</span>}
                  {e.name === 'Amir H.' && rank < amirWA && <span style={{ fontSize: '0.62rem', color: '#22c55e', background: 'rgba(34,197,94,0.10)', borderRadius: 4, padding: '1px 5px' }}>promoted</span>}
                </div>
                <div style={{ position: 'absolute', right: 8, top: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>{e.score.toFixed(4)}</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: '10px 12px', background: `${VIOLET}08`, border: `1px solid ${VIOLET}22`, borderRadius: 8, fontSize: '0.72rem', color: VIOLET, lineHeight: 1.55 }}>
            Zara drops to #{zaraTopsis + 1}. Amir rises to #{amirTopsis + 1} because CSAT 4.5, retention 82%, and credential tier 5 outweigh raw volume.
          </div>
        </div>
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {[
          { expert: 'Zara K.',   wa: zaraWA + 1,  top: zaraTopsis + 1, dir: 'down', note: 'High volume hid low quality' },
          { expert: 'Amir H.',  wa: amirWA + 1,  top: amirTopsis + 1, dir: 'up',   note: 'Depth rewarded over volume' },
          { expert: 'Arjun S.', wa: 1,            top: 1,              dir: 'same', note: 'Both methods agree' },
        ].map(s => (
          <div key={s.expert} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: s.dir === 'down' ? '1px solid #ef444422' : s.dir === 'up' ? '1px solid #22c55e22' : `1px solid ${VIOLET}18`, borderRadius: 10 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{s.expert}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>WA: #{s.wa}</span>
              <span style={{ fontSize: '0.72rem', color: '#334155' }}>→</span>
              <span style={{ fontSize: '0.72rem', color: s.dir === 'down' ? '#ef4444' : s.dir === 'up' ? '#22c55e' : VIOLET, fontWeight: 700 }}>ERS: #{s.top}</span>
            </div>
            <div style={{ fontSize: '0.66rem', color: '#475569', lineHeight: 1.45 }}>{s.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── LiveERSSimulator ───────────────────────────────────────────────────────────
function LiveERSSimulator() {
  const [csat,         setCsat]         = useState(4.2)
  const [sessions,     setSessions]     = useState(90)
  const [retention,    setRetention]    = useState(0.65)
  const [responseTime, setResponseTime] = useState(6.0)
  const [credTier,     setCredTier]     = useState(3)

  const hypothetical = { name: 'You', csat, sessions, retention, responseTime, credTier }
  const poolWithHyp  = [...SAMPLE_EXPERTS, hypothetical]
  const { ers, order } = computeTopsis(poolWithHyp)
  const hypIdx  = poolWithHyp.length - 1
  const hypErs  = ers[hypIdx]
  const hypRank = order.findIndex(o => o.i === hypIdx) + 1
  const aiGate  = hypErs >= 0.65

  const raw     = [csat, sessions, retention, responseTime, credTier]
  const rawPool = poolWithHyp.map(e => [e.csat, e.sessions, e.retention, e.responseTime, e.credTier])
  const norms   = CRITERIA.map((_, j) => Math.sqrt(rawPool.reduce((s, r) => s + r[j] ** 2, 0)))
  const wVals   = raw.map((v, j) => (v / (norms[j] || 1)) * CRITERIA[j].weight)
  const maxW    = CRITERIA.map((_, j) => Math.max(...rawPool.map(r => r[j] / (norms[j] || 1) * CRITERIA[j].weight)))
  const stateColor = hypErs >= 0.80 ? '#22c55e' : hypErs >= 0.65 ? VIOLET : '#64748b'

  const sliders = [
    { label: 'CSAT',            icon: '★', val: csat,         set: (v: number) => setCsat(v),         min: 1,    max: 5,   step: 0.1,  fmt: (v: number) => v.toFixed(1),              cost: false },
    { label: 'Session Count',   icon: '◎', val: sessions,     set: (v: number) => setSessions(v),     min: 5,    max: 300, step: 5,    fmt: (v: number) => String(Math.round(v)),     cost: false },
    { label: 'Retention Rate',  icon: '↩', val: retention,    set: (v: number) => setRetention(v),    min: 0.10, max: 1.0, step: 0.01, fmt: (v: number) => `${Math.round(v * 100)}%`, cost: false },
    { label: 'Response Time',   icon: '⏱', val: responseTime, set: (v: number) => setResponseTime(v), min: 1,    max: 20,  step: 0.5,  fmt: (v: number) => `${v.toFixed(1)}m`,        cost: true  },
    { label: 'Credential Tier', icon: '✓', val: credTier,     set: (v: number) => setCredTier(v),     min: 1,    max: 5,   step: 1,    fmt: (v: number) => `Tier ${Math.round(v)}`,   cost: false },
  ]

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: `1px solid ${stateColor}28`, borderRadius: 16, padding: '24px 26px', transition: 'border-color 0.4s' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Build your expert profile - watch ERS update live</div>
      <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 24, maxWidth: 640 }}>
        If you were adapting this for your own platform - telehealth, tutoring, freelance - this is where you would start. Drag the sliders to profile a hypothetical expert. The TOPSIS engine runs against the pool in real time.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        <div>
          {sliders.map((s, i) => (
            <div key={s.label} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.78rem', color: s.cost ? '#f59e0b' : '#94a3b8' }}>
                  {s.icon} {s.label}{s.cost && <span style={{ fontSize: '0.62rem', color: '#334155' }}> (lower is better)</span>}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: s.cost ? '#f59e0b' : VIOLET }}>{s.fmt(s.val)}</span>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                onChange={e => s.set(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: s.cost ? '#f59e0b' : VIOLET, cursor: 'pointer' }} />
              <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (wVals[i] / (maxW[i] || 1)) * 100)}%`, background: s.cost ? '#f59e0b' : VIOLET, opacity: 0.6, borderRadius: 2, transition: 'width 0.15s' }} />
              </div>
              <div style={{ fontSize: '0.6rem', color: '#334155', marginTop: 2 }}>Weighted contribution: {(wVals[i] * 100).toFixed(2)} pts</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '20px', background: `${stateColor}10`, border: `2px solid ${stateColor}30`, borderRadius: 14, textAlign: 'center', transition: 'all 0.4s' }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Expert Readiness Score</div>
            <div style={{ fontSize: '2.8rem', fontWeight: 900, color: stateColor, letterSpacing: '-0.03em', lineHeight: 1, transition: 'color 0.4s' }}>{hypErs.toFixed(3)}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 8 }}>Rank #{hypRank} of {poolWithHyp.length}</div>
          </div>
          <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
            <div style={{ fontSize: '0.7rem', color: aiGate ? '#22c55e' : '#475569', fontWeight: 700, marginBottom: 6 }}>
              {aiGate ? '✓ AI training eligible' : '✗ Below AI gate (ERS < 0.65)'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#334155', lineHeight: 1.55 }}>
              {aiGate ? 'Conversations would enter the fine-tuning dataset.' : 'Stored for analytics only. Not fed to the model.'}
            </div>
          </div>
          <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 8 }}>Pool comparison</div>
            {order.map(({ i: expIdx, s: score }, rank) => {
              const isYou = expIdx === hypIdx
              return (
                <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.7rem', color: isYou ? stateColor : '#64748b', fontWeight: isYou ? 700 : 400 }}>#{rank + 1} {isYou ? 'You' : poolWithHyp[expIdx].name}</span>
                  <span style={{ fontSize: '0.7rem', color: isYou ? stateColor : '#334155', fontFamily: 'monospace' }}>{score.toFixed(3)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── QualityImprovementChart ────────────────────────────────────────────────────
const Q_BINS   = ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0']
const Q_BEFORE = [3, 8, 14, 22, 28, 19, 12, 7, 4]
const Q_AFTER  = [1, 2,  4,  6, 10, 18, 32, 24, 11]

function QualityImprovementChart() {
  const [show, setShow] = useState<'before' | 'after' | 'both'>('both')
  const globalMax  = Math.max(...Q_BEFORE, ...Q_AFTER)
  const totalB     = Q_BEFORE.reduce((s, n) => s + n, 0)
  const totalA     = Q_AFTER.reduce((s, n) => s + n, 0)
  const meanBefore = Q_BINS.reduce((s, b, i) => s + parseFloat(b) * Q_BEFORE[i], 0) / totalB
  const meanAfter  = Q_BINS.reduce((s, b, i) => s + parseFloat(b) * Q_AFTER[i],  0) / totalA
  const BAR_H      = 110

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>CSAT distribution shift after ERS implementation</div>
      <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 20, maxWidth: 640 }}>
        Before ERS, routing was based on availability. The distribution was flat and left-heavy. After ERS-guided routing started prioritising high-scoring experts, the whole curve shifted right. That&apos;s where the 23% quality improvement comes from.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['before', 'after', 'both'] as const).map(s => (
          <button key={s} onClick={() => setShow(s)} style={{
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600,
            border: `2px solid ${show === s ? VIOLET : 'rgba(255,255,255,0.08)'}`,
            background: show === s ? `${VIOLET}18` : 'rgba(255,255,255,0.02)',
            color: show === s ? VIOLET : '#64748b', transition: 'all 0.15s',
          }}>{s === 'before' ? 'Before ERS' : s === 'after' ? 'After ERS' : 'Overlay'}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: BAR_H + 28, paddingBottom: 22, position: 'relative' }}>
        {Q_BINS.map((bin, i) => {
          const bH = (Q_BEFORE[i] / globalMax) * BAR_H
          const aH = (Q_AFTER[i]  / globalMax) * BAR_H
          return (
            <div key={bin} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: BAR_H + 28, position: 'relative' }}>
              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 1, height: BAR_H }}>
                {(show === 'before' || show === 'both') && (
                  <div style={{ flex: 1, height: bH, background: '#f59e0b', opacity: show === 'both' ? 0.45 : 0.65, borderRadius: '3px 3px 0 0', transition: 'height 0.4s' }} />
                )}
                {(show === 'after' || show === 'both') && (
                  <div style={{ flex: 1, height: aH, background: VIOLET, opacity: 0.65, borderRadius: '3px 3px 0 0', transition: 'height 0.4s' }} />
                )}
              </div>
              <div style={{ fontSize: '0.58rem', color: '#334155', position: 'absolute', bottom: 0 }}>{bin}</div>
            </div>
          )
        })}
        {(show === 'before' || show === 'both') && (
          <div style={{ position: 'absolute', bottom: 22, left: `${((meanBefore - 1) / 4) * 100}%`, width: 1, height: BAR_H, background: '#f59e0b', opacity: 0.9 }}>
            <div style={{ position: 'absolute', top: -16, left: 4, fontSize: '0.6rem', color: '#f59e0b', whiteSpace: 'nowrap' }}>avg {meanBefore.toFixed(1)}</div>
          </div>
        )}
        {(show === 'after' || show === 'both') && (
          <div style={{ position: 'absolute', bottom: 22, left: `${((meanAfter - 1) / 4) * 100}%`, width: 1, height: BAR_H, background: VIOLET, opacity: 0.9 }}>
            <div style={{ position: 'absolute', top: -16, left: 4, fontSize: '0.6rem', color: VIOLET, whiteSpace: 'nowrap' }}>avg {meanAfter.toFixed(1)}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
        {[
          { label: 'Avg CSAT before', value: meanBefore.toFixed(2),                                           color: '#f59e0b' },
          { label: 'Avg CSAT after',  value: meanAfter.toFixed(2),                                            color: VIOLET   },
          { label: 'Improvement',     value: `+${(meanAfter - meanBefore).toFixed(2)} pts`,                   color: '#22c55e' },
          { label: 'Quality lift',    value: `+${Math.round((meanAfter - meanBefore) / meanBefore * 100)}%`,  color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${s.color}20`, borderRadius: 10 }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ProjectBridge ──────────────────────────────────────────────────────────────
const BRIDGE_FLOWS = [
  { from: 'ERS Score (Rank, Reward, Retain)',      to: 'Incentive Priority (When Demand Exceeds Supply)', color: VIOLET,    icon: '⭐', dir: 'right',
    desc: 'During a Yellow or Red state, the incentive push goes to high-ERS experts first. They respond at 55% vs 30% for low-ERS experts - already invested, already accountable.' },
  { from: 'Barometer Data (When Demand Exceeds Supply)', to: 'D&S Analytics Tab (Rank, Reward, Retain)',  color: '#06b6d4', icon: '📊', dir: 'left',
    desc: 'The Demand and Supply tab in the creator dashboard pulls live barometer signals. An expert can see whether their category is Green, Yellow, or Red and adjust availability accordingly.' },
  { from: 'Expert Sessions',     to: 'Joy AI Training',          color: '#22c55e', icon: '🤖', dir: 'right',
    desc: 'Only conversations from experts above ERS 0.65 enter the fine-tuning pipeline. Low-quality conversations are excluded before they can degrade Joy for future users.' },
  { from: 'Surge Revenue (When Demand Exceeds Supply)',  to: 'Revenue Analytics (Rank, Reward, Retain)',   color: '#f59e0b', icon: '💰', dir: 'left',
    desc: 'Surge fees from Yellow or Red states appear in the Revenue tab as Surge Revenue and Expert Incentivized Revenue metrics, closing the loop for operators.' },
]

function ProjectBridge() {
  const [active, setActive] = useState(0)
  const flow = BRIDGE_FLOWS[active]

  return (
    <div style={{ marginTop: 48, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 30px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>How the two projects connect - they are one system</div>
      <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 28, maxWidth: 640 }}>
        They look like two separate projects. <a href="https://when-demand-exceeds-supply.vercel.app" style={{ color: '#06b6d4', textDecoration: 'none', fontWeight: 600 }}>When Demand Exceeds Supply</a> handles demand intelligence, <a href="https://rank-reward-retain.vercel.app" style={{ color: VIOLET, textDecoration: 'none', fontWeight: 600 }}>Rank, Reward, Retain</a> handles supply intelligence, and each feeds the other. Click the arrows to trace the data flow.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ padding: '16px 22px', background: 'rgba(6,182,212,0.08)', border: '2px solid rgba(6,182,212,0.25)', borderRadius: 12, textAlign: 'center', minWidth: 148 }}>
          <div style={{ fontSize: '0.62rem', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Companion Project</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>When Demand Exceeds Supply</div>
          <div style={{ fontSize: '0.66rem', color: '#475569', marginTop: 3 }}>Demand intelligence</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {BRIDGE_FLOWS.map((f, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20,
              border: `1.5px solid ${active === i ? f.color : 'rgba(255,255,255,0.08)'}`,
              background: active === i ? `${f.color}12` : 'rgba(255,255,255,0.02)',
              cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.68rem',
              color: active === i ? f.color : '#475569',
            }}>
              <span>{f.icon}</span>
              <span style={{ fontWeight: active === i ? 700 : 400 }}>{f.dir === 'right' ? '→' : '←'}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: '16px 22px', background: `${VIOLET}08`, border: `2px solid ${VIOLET}25`, borderRadius: 12, textAlign: 'center', minWidth: 148 }}>
          <div style={{ fontSize: '0.62rem', color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>This Project</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>Rank, Reward, Retain</div>
          <div style={{ fontSize: '0.66rem', color: '#475569', marginTop: 3 }}>Supply intelligence</div>
        </div>
      </div>
      <div style={{ padding: '18px 20px', background: `${flow.color}08`, border: `1px solid ${flow.color}25`, borderRadius: 12, transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.1rem' }}>{flow.icon}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: flow.color }}>{flow.from}</span>
          <span style={{ fontSize: '0.72rem', color: '#334155' }}>{flow.dir === 'right' ? '→' : '←'}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: flow.color }}>{flow.to}</span>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{flow.desc}</p>
      </div>
    </div>
  )
}

// ── IndustryAdapter ────────────────────────────────────────────────────────────
const INDUSTRY_PRESETS = [
  { id: 'wellness',  label: 'Wellness', icon: '🌿', color: VIOLET,    weights: [0.30, 0.25, 0.20, 0.15, 0.10],
    note: 'CSAT anchors quality. Session volume matters for supply depth. Credential tier is an entry gate, not a differentiator.',
    mults: ['15-20% category', '10% region', '15% time band', '10% volume', '15% certification', '25% exclusive contract'],
    examples: ['Astrology', 'Mental Health', 'Relationship', 'Reproductive', 'Financial Coaching'] },
  { id: 'telehealth', label: 'Telehealth', icon: '🏥', color: '#06b6d4', weights: [0.25, 0.10, 0.15, 0.15, 0.35],
    note: 'Credential tier dominates. A medical license is not optional. Volume is secondary - not a ranking driver.',
    mults: ['20-30% category', '5% region', '10% time band', '5% volume', '30% certification', '15% exclusive contract'],
    examples: ['Primary Care', 'Urgent Care', 'Mental Health', 'Specialist Referral'] },
  { id: 'tutoring', label: 'Tutoring', icon: '📚', color: '#f59e0b', weights: [0.20, 0.15, 0.35, 0.15, 0.15],
    note: 'Retention is everything. A tutor who keeps students coming back is worth more than one who delivers one-off sessions with high CSAT.',
    mults: ['10-15% category', '5% region', '20% time band', '15% volume', '10% certification', '10% exclusive contract'],
    examples: ['Mathematics', 'Sciences', 'Languages', 'Test Prep'] },
  { id: 'freelance', label: 'Freelance', icon: '💼', color: '#22c55e', weights: [0.25, 0.20, 0.20, 0.30, 0.05],
    note: 'Response time is the product. Freelancers who respond within minutes win 3x more contracts. Credential tier barely moves the needle.',
    mults: ['15-25% category', '0% region', '0% time band', '20% volume', '5% certification', '20% exclusive contract'],
    examples: ['Design', 'Development', 'Writing', 'Marketing', 'Video'] },
]

function IndustryAdapter() {
  const [active, setActive] = useState('wellness')
  const preset = INDUSTRY_PRESETS.find(p => p.id === active)!

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Adapt this framework to your industry</div>
      <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 24, maxWidth: 680 }}>
        TOPSIS and the revenue share model are industry-agnostic. The only thing that changes is the criterion weights. Here is how the configuration shifts across four verticals, and why each shift makes sense.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {INDUSTRY_PRESETS.map(p => (
          <button key={p.id} onClick={() => setActive(p.id)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            border: `2px solid ${active === p.id ? p.color : 'rgba(255,255,255,0.08)'}`,
            background: active === p.id ? `${p.color}15` : 'rgba(255,255,255,0.02)',
            color: active === p.id ? p.color : '#64748b', transition: 'all 0.15s',
          }}>{p.icon} {p.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Criterion weights</div>
          {CRITERIA.map((c, i) => (
            <div key={c.name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.76rem', color: c.type === 'cost' ? '#f59e0b' : '#94a3b8' }}>{c.icon} {c.name}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: preset.color }}>{Math.round(preset.weights[i] * 100)}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${preset.weights[i] * 100}%`, background: preset.color, opacity: 0.7, borderRadius: 3, transition: 'width 0.4s, background 0.3s' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '12px 14px', background: `${preset.color}08`, border: `1px solid ${preset.color}20`, borderRadius: 10, fontSize: '0.76rem', color: preset.color, lineHeight: 1.6 }}>
            {preset.note}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Revenue multiplier ranges</div>
          {preset.mults.map(m => {
            const spaceIdx = m.indexOf(' ')
            const val   = m.slice(0, spaceIdx)
            const label = m.slice(spaceIdx + 1)
            return (
              <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8', textTransform: 'capitalize' }}>{label}</span>
                <span style={{ fontSize: '0.76rem', color: preset.color, fontWeight: 700 }}>+{val}</span>
              </div>
            )
          })}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Example categories</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {preset.examples.map(ex => (
                <span key={ex} style={{ padding: '4px 10px', borderRadius: 6, background: `${preset.color}10`, border: `1px solid ${preset.color}22`, fontSize: '0.72rem', color: '#94a3b8' }}>{ex}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ExpertScatterPlot ──────────────────────────────────────────────────────────
function ExpertScatterPlot() {
  const [hov, setHov] = useState<number | null>(null)
  const { ers, order } = computeTopsis(SAMPLE_EXPERTS)
  const ranked = SAMPLE_EXPERTS.map((e, i) => ({ ...e, ers: ers[i], rank: order.findIndex(o => o.i === i) + 1 }))

  const W = 360, H = 240
  const pad = { l: 44, r: 16, t: 16, b: 36 }
  const pW = W - pad.l - pad.r
  const pH = H - pad.t - pad.b

  const xS = (v: number) => ((v - 3.2) / (5.0 - 3.2)) * pW
  const yS = (v: number) => pH - ((v - 40) / (220 - 40)) * pH
  const rS = (v: number) => 9 + v * 14

  const expert = hov !== null ? ranked[hov] : null

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Expert pool · CSAT vs sessions, bubble size = ERS score</div>
      <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, marginBottom: 16, maxWidth: 520 }}>
        Hover any expert. Zara has the highest session count, but ERS sits mid-table. Low CSAT and retention drag her score down despite the volume signal.
      </p>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <svg width={W} height={H} style={{ overflow: 'visible', fontFamily: 'inherit', flexShrink: 0 }}>
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
            {[0, 0.33, 0.67, 1].map(t => (
              <line key={t} x1={pad.l} y1={pad.t + t * pH} x2={pad.l + pW} y2={pad.t + t * pH} />
            ))}
          </g>
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + pH} stroke="#334155" strokeWidth="1.5" />
          <line x1={pad.l} y1={pad.t + pH} x2={pad.l + pW} y2={pad.t + pH} stroke="#334155" strokeWidth="1.5" />
          <text x={pad.l + pW / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize="9">CSAT</text>
          <text x={10} y={pad.t + pH / 2} textAnchor="middle" fill="#475569" fontSize="9" transform={`rotate(-90, 10, ${pad.t + pH / 2})`}>Sessions</text>
          {[3.5, 4.0, 4.5, 5.0].map(v => {
            const x = pad.l + xS(v)
            return <g key={v}><line x1={x} y1={pad.t + pH} x2={x} y2={pad.t + pH + 3} stroke="#334155" /><text x={x} y={pad.t + pH + 12} textAnchor="middle" fill="#475569" fontSize="8">{v.toFixed(1)}</text></g>
          })}
          {[60, 120, 180].map(v => {
            const y = pad.t + yS(v)
            return <g key={v}><line x1={pad.l - 3} y1={y} x2={pad.l} y2={y} stroke="#334155" /><text x={pad.l - 6} y={y + 3} textAnchor="end" fill="#475569" fontSize="8">{v}</text></g>
          })}
          {ranked.map((e, i) => {
            const x = pad.l + xS(e.csat)
            const y = pad.t + yS(e.sessions)
            const r = rS(e.ers)
            const isHov = hov === i
            const color = e.ers >= 0.65 ? VIOLET : '#ef4444'
            return (
              <g key={e.name} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={isHov ? r + 4 : r} fill={`${color}28`} stroke={color} strokeWidth={isHov ? 2.5 : 1.5} style={{ transition: 'r 0.15s' }} />
                <text x={x} y={y - r - 4} textAnchor="middle" fill={color} fontSize="9" fontWeight="600">{e.name.split(' ')[0]}</text>
                <text x={x} y={y + 3.5} textAnchor="middle" fill={color} fontSize="8" fontWeight="700">#{e.rank}</text>
              </g>
            )
          })}
          <g transform={`translate(${pad.l + pW - 4}, ${pad.t + 4})`}>
            <circle cx={0} cy={0} r={5} fill={`${VIOLET}28`} stroke={VIOLET} strokeWidth={1.5} />
            <text x={-8} y={4} textAnchor="end" fill={VIOLET} fontSize="8">ERS ≥ 0.65</text>
            <circle cx={0} cy={14} r={5} fill="#ef444428" stroke="#ef4444" strokeWidth={1.5} />
            <text x={-8} y={18} textAnchor="end" fill="#ef4444" fontSize="8">ERS &lt; 0.65</text>
          </g>
        </svg>
        <div style={{ flex: 1, minWidth: 180 }}>
          {expert ? (
            <div style={{ padding: '16px 18px', background: `${VIOLET}08`, border: `1px solid ${VIOLET}22`, borderRadius: 12 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{expert.name}</div>
              <div style={{ fontSize: '0.68rem', color: '#475569', marginBottom: 12 }}>ERS rank #{expert.rank} of {ranked.length}</div>
              {[
                { label: 'ERS score', val: expert.ers.toFixed(3), color: expert.ers >= 0.65 ? '#22c55e' : '#ef4444' },
                { label: 'CSAT', val: expert.csat.toString(), color: '#94a3b8' },
                { label: 'Sessions', val: expert.sessions.toString(), color: '#94a3b8' },
                { label: 'Retention', val: `${Math.round(expert.retention * 100)}%`, color: '#94a3b8' },
                { label: 'Resp. Time', val: `${expert.responseTime}m`, color: '#f59e0b' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: 5 }}>
                  <span style={{ color: '#475569' }}>{row.label}</span>
                  <span style={{ color: row.color, fontWeight: 600 }}>{row.val}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: '0.7rem', color: expert.ers >= 0.65 ? '#22c55e' : '#ef4444', fontWeight: 600, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {expert.ers >= 0.65 ? '✓ AI training eligible' : '✗ Below AI gate threshold'}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: '#334155', fontSize: '0.78rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Hover an expert
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TopsisFormulas ──────────────────────────────────────────────────────────────
function TopsisFormulas() {
  const [step, setStep] = useState(0)
  const { R, V, Apos, Aneg, dPos, dNeg, ers } = computeTopsis(SAMPLE_EXPERTS)
  const e0 = SAMPLE_EXPERTS[0]

  const raw = SAMPLE_EXPERTS.map(e => [e.csat, e.sessions, e.retention, e.responseTime, e.credTier])
  const colNorms = [0,1,2,3,4].map(j => Math.sqrt(raw.reduce((s, r) => s + r[j] ** 2, 0)))

  const STEPS = [
    {
      id: 'norm',
      label: '1  Normalize',
      formula: 'rij = xij / sqrt(sum xij^2)',
      note: 'Euclidean normalization removes unit differences. CSAT (1-5) and sessions (0-300) become dimensionless and comparable.',
      calc: `CSAT column norm = sqrt(${raw.map(r => r[0].toFixed(1) + '²').join(' + ')})`,
      calcVal: `= sqrt(${raw.reduce((s,r) => s+r[0]**2,0).toFixed(2)}) = ${colNorms[0].toFixed(4)}`,
      result: `Arjun CSAT normalized: ${e0.csat} / ${colNorms[0].toFixed(4)} = ${R[0][0].toFixed(4)}`,
    },
    {
      id: 'weight',
      label: '2  Weight',
      formula: 'vij = wj x rij',
      note: 'Multiply each normalized score by its criterion weight. CSAT weight = 0.30 contributes 3x more than Credential Tier (0.10).',
      calc: `Arjun CSAT: 0.30 x ${R[0][0].toFixed(4)}`,
      calcVal: `= ${V[0][0].toFixed(4)}`,
      result: `5 weighted values for Arjun: [${V[0].map(v => v.toFixed(4)).join(', ')}]`,
    },
    {
      id: 'ideal',
      label: '3  Ideal',
      formula: 'A+ = max(vij) for benefit  |  min(vij) for cost',
      note: 'Positive ideal A+ is the best value per criterion across all experts. Response Time flips — lower is better (cost criterion).',
      calc: `CSAT column values: [${V.map(r => r[0].toFixed(4)).join(', ')}]`,
      calcVal: `A+ (CSAT) = max = ${Apos[0].toFixed(4)}  |  A+ (Resp. Time) = min = ${Apos[3].toFixed(4)}`,
      result: `A+ = [${Apos.map(v => v.toFixed(4)).join(', ')}]`,
    },
    {
      id: 'dist',
      label: '4  Distance',
      formula: 'd+ = sqrt(sum(vij - a+j)^2)  |  d- = sqrt(sum(vij - a-j)^2)',
      note: 'Euclidean distance from the positive ideal (d+) and negative ideal (d-). Closer to A+ and farther from A- = better expert.',
      calc: `Arjun d+ = sqrt(sum of squared gaps to A+)`,
      calcVal: `= ${dPos[0].toFixed(4)}    |    d- = ${dNeg[0].toFixed(4)}`,
      result: `Arjun is ${dPos[0].toFixed(4)} from the ideal and ${dNeg[0].toFixed(4)} from the worst`,
    },
    {
      id: 'ers',
      label: '5  ERS Score',
      formula: 'ERS(i) = d-(i) / (d+(i) + d-(i))',
      note: 'Relative closeness. ERS = 1.0 means perfect on all criteria simultaneously. Threshold 0.65 gates AI training eligibility.',
      calc: `Arjun ERS = ${dNeg[0].toFixed(4)} / (${dPos[0].toFixed(4)} + ${dNeg[0].toFixed(4)})`,
      calcVal: `= ${dNeg[0].toFixed(4)} / ${(dPos[0]+dNeg[0]).toFixed(4)} = ${ers[0].toFixed(4)}`,
      result: `ERS ${ers[0].toFixed(4)} ${ers[0] >= 0.65 ? '>= 0.65: AI training eligible' : '< 0.65: below threshold'}`,
    },
  ]

  const s = STEPS[step]

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
        TOPSIS math · formula + worked example using Arjun S.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {STEPS.map((st, i) => (
          <button key={st.id} onClick={() => setStep(i)} style={{
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
            border: `2px solid ${step === i ? VIOLET : 'rgba(255,255,255,0.08)'}`,
            background: step === i ? `${VIOLET}18` : 'rgba(255,255,255,0.02)',
            color: step === i ? VIOLET : '#64748b', transition: 'all 0.15s',
          }}>{st.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: '18px 20px', background: `${VIOLET}06`, border: `1px solid ${VIOLET}20`, borderRadius: 12 }}>
          <div style={{ fontSize: '0.6rem', color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Formula</div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: '#e2e8f0', marginBottom: 12, lineHeight: 1.5 }}>{s.formula}</div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.65, margin: 0 }}>{s.note}</p>
        </div>
        <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.6rem', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Worked: Arjun S. (csat 4.8, sessions 142, retention 73%, resp 4.2m, cred T3)
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.79rem', color: '#64748b', lineHeight: 1.9 }}>
            <div>{s.calc}</div>
            <div style={{ color: '#94a3b8' }}>{s.calcVal}</div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', color: VIOLET, fontWeight: 700, fontSize: '0.82rem' }}>
              {s.result}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ERSBarChart ─────────────────────────────────────────────────────────────────
function ERSBarChart() {
  const [hov, setHov] = useState<number | null>(null)
  const { ers, order } = computeTopsis(SAMPLE_EXPERTS)
  const ranked = order.map(o => ({ ...SAMPLE_EXPERTS[o.i], ers: o.s }))

  const BAR_W = 44, GAP = 20, MAX_H = 160, PAD_L = 48, PAD_B = 48, PAD_T = 32
  const svgW = PAD_L + ranked.length * (BAR_W + GAP) + GAP + 10
  const svgH = MAX_H + PAD_B + PAD_T

  return (
    <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 26px' }}>
      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        ERS scores · all 5 experts, AI threshold at 0.65
      </div>
      <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, marginBottom: 20, maxWidth: 560 }}>
        Purple bars pass the AI training gate (ERS &ge; 0.65). Red bars fall below. Hover to inspect. Notice Nadia ranks last despite 178 sessions — CSAT 3.4 and 44% retention make her the worst overall profile.
      </p>
      <svg width={svgW} height={svgH} style={{ overflow: 'visible', fontFamily: 'inherit' }}>
        {/* Y gridlines */}
        {[0, 0.25, 0.5, 0.65, 0.75, 1.0].map(v => {
          const y = PAD_T + MAX_H - v * MAX_H
          const isThreshold = v === 0.65
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={svgW - 10} y2={y}
                stroke={isThreshold ? '#f59e0b' : 'rgba(255,255,255,0.05)'}
                strokeWidth={isThreshold ? 1.5 : 1}
                strokeDasharray={isThreshold ? '5 3' : undefined} />
              {isThreshold && (
                <text x={PAD_L + 4} y={y - 5} fill="#f59e0b" fontSize="9">AI gate 0.65</text>
              )}
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fill="#475569" fontSize="9">{v.toFixed(2)}</text>
            </g>
          )
        })}
        {/* Y axis */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + MAX_H} stroke="#334155" strokeWidth="1.5" />

        {/* Bars */}
        {ranked.map((e, i) => {
          const x = PAD_L + GAP + i * (BAR_W + GAP)
          const barH = e.ers * MAX_H
          const y = PAD_T + MAX_H - barH
          const isHov = hov === i
          const color = e.ers >= 0.65 ? VIOLET : '#ef4444'
          return (
            <g key={e.name} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={BAR_W} height={barH}
                rx={5} fill={isHov ? color : `${color}70`}
                style={{ transition: 'fill 0.15s' }} />
              <text x={x + BAR_W / 2} y={y - 6} textAnchor="middle"
                fill={color} fontSize="10" fontWeight="700">{e.ers.toFixed(3)}</text>
              <text x={x + BAR_W / 2} y={PAD_T + MAX_H + 16} textAnchor="middle"
                fill={isHov ? '#e2e8f0' : '#64748b'} fontSize="9">{e.name.split(' ')[0]}</text>
              <text x={x + BAR_W / 2} y={PAD_T + MAX_H + 28} textAnchor="middle"
                fill="#334155" fontSize="8">#{i + 1}</text>
            </g>
          )
        })}
      </svg>
      {hov !== null && (
        <div style={{ marginTop: 10, padding: '10px 16px', background: `${ranked[hov].ers >= 0.65 ? VIOLET : '#ef4444'}08`, border: `1px solid ${ranked[hov].ers >= 0.65 ? VIOLET : '#ef4444'}25`, borderRadius: 8, fontSize: '0.78rem', color: '#94a3b8' }}>
          <span style={{ color: ranked[hov].ers >= 0.65 ? VIOLET : '#ef4444', fontWeight: 700 }}>{ranked[hov].name}</span>
          {' '}· ERS {ranked[hov].ers.toFixed(3)} · CSAT {ranked[hov].csat} · {ranked[hov].sessions} sessions · {Math.round(ranked[hov].retention * 100)}% retention
          · {ranked[hov].ers >= 0.65 ? 'AI training eligible' : 'below AI gate'}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e2e8f0' }}>
      <SectionNav />

      {/* companion project banner */}
      <div style={{ background: 'rgba(139,92,246,0.05)', borderBottom: '1px solid rgba(139,92,246,0.15)', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: '0.72rem', color: '#475569' }}>Part of a two-project system</span>
        <a href="https://when-demand-exceeds-supply.vercel.app" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '0.76rem', color: VIOLET, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          Companion: When Demand Exceeds Supply (real-time demand balancing) →
        </a>
      </div>

      {/* ── Hero ── */}
      <section id="problem" style={{ padding: '80px 32px 100px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${VIOLET}12, transparent)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: VIOLET }} />
            <span style={{ fontSize: '0.72rem', color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Expert Marketplace · Supply Intelligence, Singapore 2024</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 24, color: '#f8fafc' }}>
            Rank, Reward, Retain
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#94a3b8', lineHeight: 1.75, maxWidth: 680, marginBottom: 48 }}>
            I built the supply intelligence layer for a two-sided expert marketplace from the ground up — a TOPSIS scoring engine to rank every expert against five quality criteria, a dynamic revenue framework that turns platform behaviour into financial incentives, and a full creator analytics suite with 48 tracked metrics. All three systems delivered before the engineering team had capacity to build anything.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 24, maxWidth: 680, marginBottom: 48 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
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
              The marketplace had hundreds of experts and no way to tell which ones were actually good.
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 40 }}>
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
          <TopsisFormulas />
          <ERSBarChart />
          <ExpertScatterPlot />
          <WeightedAvgVsTopsis />
          <CredentialTierScale />
          <ERSScorecard />
          <LiveERSSimulator />
          <QualityImprovementChart />

          <div style={{ marginTop: 28, padding: '18px 22px', background: `${VIOLET}06`, border: `1px solid ${VIOLET}18`, borderRadius: 12 }}>
            <div style={{ fontSize: '0.68rem', color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Design decision: not a black box</div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
              Every ERS output includes a per-criterion breakdown. Operators can see exactly why Expert A outranks Expert B and which criterion is the gap. That interpretability matters: a score that ops can&apos;t explain cannot drive decisions about routing, training, or compensation.
            </p>
          </div>
          <IndustryAdapter />
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
            A flat commission splits incentive evenly across all experts and all hours. That&apos;s not what a marketplace needs. The platform needed supply in the right categories, the right regions, the right time bands. The revenue share model is how you steer supply without a scheduling manager working round the clock.
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
                On 20 sessions/month at a $50 average session fee, that&apos;s $700/month earned. The incentive to take late-night sessions in a high-demand region is built directly into the number, not an ops team&apos;s Slack message.
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
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
              Three-tab Google Sheets dashboard: Onboarding (creator profiles and KYC status), Demand and Supply (live matching metrics that link back to the companion project&apos;s barometer), and Revenue (earnings, share breakdown, LTV). Running before any analytics engineering was in place, because that&apos;s what the timeline demanded.
            </p>
          </div>
          <ProjectBridge />
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
            The platform&apos;s AI companion was trained on 3M+ real expert conversations, but not all of them. The ERS scoring system became the quality gate for the AI training pipeline: only conversations from experts above the ERS threshold entered the fine-tuning dataset. Low-quality expert conversations were excluded before they could degrade the model.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
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
              <a href="https://when-demand-exceeds-supply.vercel.app" style={{ color: '#06b6d4', textDecoration: 'none', fontWeight: 600 }}>When Demand Exceeds Supply</a> handles real-time routing: during a Yellow state, high-ERS experts receive the incentive push first. <a href="https://rank-reward-retain.vercel.app" style={{ color: VIOLET, textDecoration: 'none', fontWeight: 600 }}>Rank, Reward, Retain</a> generates those ERS scores. Joy then learns from the conversations those high-ERS experts have. The scoring system, the ops layer, and the AI companion are the same pipeline seen from three different vantage points.
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 48 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
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

      {/* ── Replication Guide ── */}
      <section style={{ padding: '0 32px 80px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${VIOLET}10`, border: `1px solid ${VIOLET}25`, borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
            <span style={{ fontSize: '0.68rem', color: VIOLET, fontWeight: 700, letterSpacing: '0.1em' }}>ADAPT IT</span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>FOR YOUR PLATFORM</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)', fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
            Apply this framework to any expert marketplace
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 660, marginBottom: 36 }}>
            TOPSIS is platform-agnostic. The criteria and weights change; the algorithm does not. Here is how to adapt all three arcs for a different vertical.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              {
                step: '01',
                arc: 'Rank',
                color: VIOLET,
                title: 'Define your quality criteria',
                body: 'Pick 4-6 measurable signals. Assign weights that sum to 1.0. Mark each as benefit (higher better) or cost (lower better). Run the Python script with your preset - the algorithm works on any criteria combination.',
                example: 'Telehealth: credential tier 0.35 (safety-critical) vs. wellness: CSAT 0.30. Same algorithm, different industry logic.',
              },
              {
                step: '02',
                arc: 'Reward',
                color: '#06b6d4',
                title: 'Calibrate your multipliers',
                body: 'Identify the dimensions that drive supply quality in your market: category risk, geography, time band, volume, certification. Set additive multipliers and a base rate range. Cap at a sustainable maximum.',
                example: 'Tutoring platform: add subject-difficulty multiplier (+15% for STEM) and exam-season multiplier (+10% peak periods).',
              },
              {
                step: '03',
                arc: 'Retain',
                color: '#22c55e',
                title: 'Instrument before you build',
                body: 'The 48-metric framework starts with event instrumentation. Track session starts, completions, CSAT submissions, and payment outcomes before anything else. Everything else is computed from those four events.',
                example: 'Ship the tracking spec in week 1. Build the dashboard in week 3 once data exists. Never the other way around.',
              },
            ].map(item => (
              <div key={item.step} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${item.color}18`, borderRadius: 14, padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: item.color, opacity: 0.4 }}>{item.step}</div>
                  <div style={{ fontSize: '0.7rem', color: item.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.arc}</div>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>{item.title}</div>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.65, marginBottom: 14 }}>{item.body}</p>
                <div style={{ padding: '10px 12px', background: `${item.color}06`, border: `1px solid ${item.color}18`, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.62rem', color: item.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Example</div>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>{item.example}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: '16px 22px', background: `${VIOLET}06`, border: `1px solid ${VIOLET}18`, borderRadius: 12, maxWidth: 680 }}>
            <div style={{ fontSize: '0.68rem', color: VIOLET, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Full code available</div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
              The TOPSIS engine, revenue share model, and creator analytics scripts are all open-source on GitHub with CLI flags for switching presets. Clone the repo, run <code style={{ background: 'rgba(139,92,246,0.12)', padding: '1px 6px', borderRadius: 4, fontSize: '0.78rem', color: VIOLET }}>python analytics/topsis_ers_calculator.py --preset telehealth --compare</code>, and see how the rankings shift.
            </p>
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
