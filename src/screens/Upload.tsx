import { useStore } from '../store'
export default function Upload() {
  const go = useStore((s) => s.go)
  return (
    <div className="h-full flex items-center justify-center bg-teal">
      <button className="btn" onClick={() => go('world')}>(stub) Enter world</button>
    </div>
  )
}
