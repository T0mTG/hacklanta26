import { BufferGeometry, Color, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, type Texture } from 'three'
import { LITE } from '../lib/env'
import { buildEntryGeometry } from './cardGeometry'
import { paperDepthMaterial, paperMaterial, uniformsFor } from './paperMaterial'
import type { PaperEntry } from './types'

// Every copy of one cut-out is drawn by one InstancedMesh (one draw call, one more for its shadow). The batch keeps the per-copy
// arrays: where it stands (matrix), a brightness tint, and the numbers the shader uses to bend it differently from its neighbors.
const castsShadow = (e: PaperEntry) => !LITE && e.size >= 0.55

export class CardBatch {
  readonly entry: PaperEntry
  mesh!: InstancedMesh
  uids: string[] = []
  count = 0
  capacity: number
  private geometry: BufferGeometry
  private texture: Texture
  private anim!: Float32Array
  private birth!: Float32Array
  private animAttr!: InstancedBufferAttribute
  private birthAttr!: InstancedBufferAttribute
  private parent: Group

  constructor(entry: PaperEntry, texture: Texture, parent: Group, capacity: number) {
    this.entry = entry
    this.texture = texture
    this.parent = parent
    this.capacity = Math.max(4, capacity)
    this.geometry = buildEntryGeometry(entry)
    this.make(null)
  }

  // (re)build the InstancedMesh at the current capacity, keeping whatever the old one held
  private make(old: InstancedMesh | null) {
    const u = uniformsFor(this.entry)
    const cap = this.capacity
    const geo = this.geometry.clone()
    this.anim = new Float32Array(cap * 4)
    this.birth = new Float32Array(cap).fill(-1000)
    this.animAttr = new InstancedBufferAttribute(this.anim, 4)
    this.birthAttr = new InstancedBufferAttribute(this.birth, 1)
    geo.setAttribute('aAnim', this.animAttr)
    geo.setAttribute('aBirth', this.birthAttr)
    const mesh = new InstancedMesh(geo, paperMaterial(this.entry, this.texture, u), cap)
    if (castsShadow(this.entry)) mesh.customDepthMaterial = paperDepthMaterial(this.entry, u)
    mesh.castShadow = castsShadow(this.entry)
    mesh.receiveShadow = true
    mesh.frustumCulled = false // copies cover the whole planet; the one-copy bounds would wrongly cull them
    mesh.count = this.count
    mesh.userData.entryId = this.entry.id
    if (old) {
      const n = Math.min(this.count, old.instanceMatrix.count)
      mesh.instanceMatrix.array.set((old.instanceMatrix.array as Float32Array).subarray(0, n * 16))
      if (old.instanceColor) {
        mesh.setColorAt(0, new Color(1, 1, 1))
        mesh.instanceColor!.array.set((old.instanceColor.array as Float32Array).subarray(0, n * 3))
      }
      const oldAnim = old.geometry.getAttribute('aAnim') as InstancedBufferAttribute
      const oldBirth = old.geometry.getAttribute('aBirth') as InstancedBufferAttribute
      this.anim.set((oldAnim.array as Float32Array).subarray(0, n * 4))
      this.birth.set((oldBirth.array as Float32Array).subarray(0, n))
      this.parent.remove(old)
      old.geometry.dispose()
      ;(old.material as { dispose(): void }).dispose()
      old.customDepthMaterial?.dispose()
      old.dispose()
    } else {
      mesh.setColorAt(0, new Color(1, 1, 1))
    }
    this.parent.add(mesh)
    this.mesh = mesh
    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor!.needsUpdate = true
    this.animAttr.needsUpdate = true
    this.birthAttr.needsUpdate = true
  }

  // a free slot (the batch grows if it has to)
  add(uid: string): number {
    if (this.count >= this.capacity) {
      this.capacity *= 2
      this.make(this.mesh)
    }
    const i = this.count++
    this.uids[i] = uid
    this.mesh.count = this.count
    return i
  }

  // take a copy out: the last copy moves into its place. Returns the uid that moved, so its owner can update its slot.
  remove(i: number): string | null {
    const last = this.count - 1
    let moved: string | null = null
    if (i !== last) {
      const m = new Matrix4()
      this.mesh.getMatrixAt(last, m)
      this.mesh.setMatrixAt(i, m)
      const c = new Color()
      this.mesh.getColorAt(last, c)
      this.mesh.setColorAt(i, c)
      this.anim.copyWithin(i * 4, last * 4, last * 4 + 4)
      this.birth[i] = this.birth[last]
      moved = this.uids[last]
      this.uids[i] = moved
      this.animAttr.needsUpdate = true
      this.birthAttr.needsUpdate = true
    }
    this.uids.length = last
    this.count = last
    this.mesh.count = last
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    return moved
  }

  setMatrix(i: number, m: Matrix4) {
    this.mesh.setMatrixAt(i, m)
  }

  setTint(i: number, c: Color) {
    this.mesh.setColorAt(i, c)
  }

  // phase, amplitude (1 = as designed), hue shift in radians, curl (-1..1)
  setAnim(i: number, phase: number, amp: number, hue: number, curl: number) {
    const o = i * 4
    this.anim[o] = phase; this.anim[o + 1] = amp; this.anim[o + 2] = hue; this.anim[o + 3] = curl
    this.animAttr.needsUpdate = true
  }

  // the moment (shader seconds) this copy popped up; it grows from nothing with a little overshoot
  setBirth(i: number, t: number) {
    this.birth[i] = t
    this.birthAttr.needsUpdate = true
  }

  flush() {
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  dispose() {
    this.parent.remove(this.mesh)
    this.mesh.geometry.dispose()
    ;(this.mesh.material as { dispose(): void }).dispose()
    this.mesh.customDepthMaterial?.dispose()
    this.mesh.dispose()
    this.geometry.dispose()
  }
}
