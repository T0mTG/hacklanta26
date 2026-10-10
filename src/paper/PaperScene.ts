import { Color, Group, Matrix4, Quaternion, Vector3, type Texture } from 'three'
import { WATER_R } from '../lib/sphere'
import { frameFor } from '../world/place'
import { surfaceRadius } from '../world/terrain'
import { CardBatch } from './batch'
import { paperItems, type PaperItem } from './items'

const _q = new Quaternion(), _p = new Vector3(), _s = new Vector3(), _m = new Matrix4(), _c = new Color()

// Owns the instanced meshes and keeps them in step with the items. Items come and go (the kid adds and removes things), so slots
// are handed out and given back; nothing else needs to know which instance belongs to which item.
export class PaperScene {
  readonly group = new Group()
  private batches = new Map<string, CardBatch>()
  private spare = 10

  constructor(private textures: Map<string, Texture>) {}

  // How many copies of each cut-out are about to be added, so each batch is made once at about the right size
  private counts = new Map<string, number>()
  expect(items: PaperItem[]) {
    for (const it of items) this.counts.set(it.entry.id, (this.counts.get(it.entry.id) ?? 0) + 1)
  }

  private batchFor(it: PaperItem) {
    let b = this.batches.get(it.entry.id)
    if (!b) {
      const tex = this.textures.get(it.entry.id)
      if (!tex) return null // its picture never loaded: leave it out rather than draw a blank card
      b = new CardBatch(it.entry, tex, this.group, (this.counts.get(it.entry.id) ?? 1) + this.spare)
      this.batches.set(it.entry.id, b)
    }
    return b
  }

  add(it: PaperItem, birth = -1000) {
    const b = this.batchFor(it)
    paperItems.set(it.uid, it)
    if (!b) return
    it.batch = b
    it.slot = b.add(it.uid)
    b.setAnim(it.slot, it.seed * 40, 1, it.hue, it.curl)
    b.setBirth(it.slot, birth)
    b.setTint(it.slot, _c.setScalar(it.tint))
    this.writePose(it)
    b.flush()
  }

  remove(uid: string) {
    const it = paperItems.get(uid)
    if (!it) return
    paperItems.delete(uid)
    if (it.batch) {
      const moved = it.batch.remove(it.slot)
      if (moved) { const m = paperItems.get(moved); if (m) m.slot = it.slot }
      it.batch.flush()
    }
    it.batch = null
    it.slot = -1
  }

  // Write where an item stands into its instance. Call after changing dir, yaw, scale, lift or squash.
  writePose(it: PaperItem) {
    const b = it.batch
    if (!b || it.slot < 0) return
    frameFor(it.dir, it.yaw, _q)
    const radius = it.entry.shape === 'flat' ? WATER_R + 0.03 : surfaceRadius(it.dir)
    _p.copy(it.dir).multiplyScalar(radius + it.lift)
    const sq = it.squash
    _s.set(it.scale * (1 + sq * 0.6), it.scale * (1 - sq), it.scale * (1 + sq * 0.6))
    _m.compose(_p, _q, _s)
    b.setMatrix(it.slot, _m)
    it.top.copy(it.dir).multiplyScalar(radius + it.lift + it.entry.size * it.scale * 0.9)
  }

  update(dt: number, time: number) {
    for (const it of paperItems.values()) {
      if (!it.life) continue
      it.life.update(it, dt, time)
      this.writePose(it)
    }
    for (const b of this.batches.values()) b.flush()
  }

  // the number of copies drawn, for the dev stats
  get drawn() {
    let n = 0
    for (const b of this.batches.values()) n += b.count
    return n
  }

  get batchCount() { return this.batches.size }

  dispose() {
    for (const b of this.batches.values()) b.dispose()
    this.batches.clear()
    for (const uid of [...paperItems.keys()]) paperItems.delete(uid)
  }
}
