import { Clouds } from '../world/Atmosphere'

// Everything that stands on the Paper Globe. Phase 0: just the shared clouds, so the switch and the paper-colored terrain
// can be checked; the cut-outs arrive in the next phases.
export default function PaperContent() {
  return (
    <>
      <Clouds />
    </>
  )
}
