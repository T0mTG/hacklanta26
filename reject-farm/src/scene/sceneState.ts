// Per-frame scene data that lives outside React: where each creature is
// standing right now, which ones are mid-arrival, and a few hooks the UI
// uses to talk to the 3D scene.
import { Camera, Vector3 } from 'three'

/** globe.gl's globe is always 100 units in radius */
export const PLANET_R = 100

export const scene = {
  camera: null as Camera | null,
  /** unit vector from the planet's centre to each creature */
  positions: new Map<string, Vector3>(),
  /** creatures still dropping in from the sky: id -> the time they started, in seconds */
  spawns: new Map<string, number>(),
  /** picks the spot the front page's paper ball should land on, and returns it in screen pixels */
  aim: null as null | (() => { x: number; y: number }),
  /** where the paper ball landed */
  introDir: null as Vector3 | null,
  /** finds dry land in front of the viewer for a new creature to land on */
  findLanding: null as null | (() => Vector3),
  /** pointer position across the window, -1..1, for parallax */
  pointer: { x: 0, y: 0 },
}

export const now = () => performance.now() / 1000

export function dirFromLatLon(lat: number, lon: number): Vector3 {
  const a = (lat * Math.PI) / 180
  const o = (lon * Math.PI) / 180
  return new Vector3(Math.cos(a) * Math.sin(o), Math.sin(a), Math.cos(a) * Math.cos(o))
}

export function latLonFromDir(d: Vector3): { lat: number; lng: number } {
  return { lat: (Math.asin(Math.max(-1, Math.min(1, d.y))) * 180) / Math.PI, lng: (Math.atan2(d.x, d.z) * 180) / Math.PI }
}
