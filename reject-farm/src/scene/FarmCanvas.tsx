import { useEffect, useRef } from 'react'
import { createFarm } from './farm'

export default function FarmCanvas() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => createFarm(ref.current!), [])
  return <div ref={ref} className="farm" role="img" aria-label="The farm: a tiny planet where rejected designs wander as animals" />
}
