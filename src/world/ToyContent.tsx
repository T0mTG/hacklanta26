import { useEffect } from 'react'
import EaselDrag from '../entities/EaselDrag'
import Easels from '../entities/Easels'
import Kid from '../entities/Kid'
import Population from '../entities/Population'
import Atmosphere from './Atmosphere'
import Buildings from './Buildings'
import Flora from './Flora'
import { ensureNeighbors } from './spots'

// Everything that stands on the Toy Globe: low-poly trees and buildings, toy people and animals, and the easels.
export default function ToyContent() {
  // the planet is never empty: six neighbor drawings are there from the first moment
  useEffect(() => { ensureNeighbors() }, [])
  return (
    <>
      <Flora />
      <Buildings />
      <Atmosphere />
      <Easels />
      <Population />
      <Kid />
      <EaselDrag />
    </>
  )
}
