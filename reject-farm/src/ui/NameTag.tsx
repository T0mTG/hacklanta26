import { useEffect, useMemo, useState } from 'react'
import { scene } from '../scene/sceneState'
import { continentAt } from '../scene/world'
import { stampCount, useStore } from '../store'

function ago(ts: number): string {
  const days = Math.round((Date.now() - ts) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return `${Math.round(days / 7)} weeks ago`
}

function tally(n: number, mine: boolean): string {
  if (n === 0) return 'Nobody has picked it yet. Be the first.'
  if (mine && n === 1) return 'You would have picked this one.'
  if (mine) return `You and ${n - 1} ${n - 1 === 1 ? 'other' : 'others'} would have picked this one.`
  return `${n} ${n === 1 ? 'person' : 'people'} would have picked this one.`
}

export function NameTag() {
  const c = useStore((s) => s.creatures.find((x) => x.id === s.selectedId))
  const myStamps = useStore((s) => s.myStamps)
  const select = useStore((s) => s.select)
  const stamp = useStore((s) => s.stamp)
  const remove = useStore((s) => s.remove)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => setConfirming(false), [c?.id])
  useEffect(() => {
    if (!c) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && select(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [c, select])

  // which continent it has wandered to
  const where = useMemo(() => {
    const p = c ? scene.positions.get(c.id) : null
    return p ? continentAt(p)?.name : null
  }, [c])

  if (!c) return null
  const mine = !!myStamps[c.id]
  const n = stampCount(c, myStamps)

  return (
    <aside className="tag-wrap" key={c.id} aria-label={`${c.name}'s name tag`}>
      <div className="string" aria-hidden="true" />
      <article className="tag">
        <span className="hole" aria-hidden="true" />
        <button className="icon-btn close" onClick={() => select(null)} aria-label="Close name tag">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <figure className="art portrait">
          <span className="tape" aria-hidden="true" />
          <img src={c.artSrc} alt={c.name} />
          {mine && (
            <span className="stamp-mark" aria-hidden="true">
              Picked
            </span>
          )}
        </figure>

        <h2>{c.name}</h2>
        <p className="hand by">
          by {c.creator} &middot; arrived {ago(c.createdAt)}
        </p>
        {where && <p className="wearing">last seen in <b>{where}</b></p>}

        {c.note && (
          <div className="note">
            <span className="label">Its story</span>
            <p className="hand">{c.note}</p>
          </div>
        )}

        <button className={`btn berry${mine ? ' done' : ''}`} onClick={() => stamp(c.id)} disabled={mine}>
          {mine ? 'Stamped. Good taste.' : 'I’d have picked this one'}
        </button>
        <p className="tally">{tally(n, mine)}</p>

        {confirming ? (
          <p className="goodbye">
            Say goodbye?{' '}
            <button className="link" onClick={() => remove(c.id)}>
              Yes, set it free
            </button>{' '}
            <button className="link" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </p>
        ) : (
          <button className="link quiet" onClick={() => setConfirming(true)}>
            Send it off to pasture
          </button>
        )}
      </article>
    </aside>
  )
}
