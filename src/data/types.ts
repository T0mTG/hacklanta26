import type { Texture } from 'three'
export type Role = 'creature' | 'billboard' | 'house' | 'doll' | 'relic'
export interface Artwork {
  id: string; name: string; texture: Texture; aspect: number; role: Role
  label: string; color: string; url: string
}
