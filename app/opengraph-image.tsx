import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Rank, Reward, Retain - Wahid Tawsif Ratul'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#0a0a0f',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(139,92,246,0.08), transparent)', display: 'flex' }} />
      <div style={{ fontSize: 13, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 28, display: 'flex' }}>
        Project 6 - Expert Marketplace
      </div>
      <div style={{ fontSize: 72, fontWeight: 900, color: '#f8fafc', lineHeight: 1.1, marginBottom: 32, display: 'flex' }}>
        Rank, Reward, Retain
      </div>
      <div style={{ fontSize: 22, color: '#64748b', maxWidth: 780, lineHeight: 1.55, display: 'flex' }}>
        TOPSIS expert scoring + dynamic revenue share + creator analytics for an expert marketplace
      </div>
      <div style={{ position: 'absolute', bottom: 72, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, color: '#334155', display: 'flex', gap: 24 }}>
          <span>ERS 0-1 quality score</span>
          <span>30-90% revenue share</span>
          <span>48 creator metrics</span>
        </div>
        <div style={{ fontSize: 14, color: '#475569', display: 'flex' }}>Wahid Tawsif Ratul</div>
      </div>
    </div>,
    { ...size }
  )
}
