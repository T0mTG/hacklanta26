import { useSyncExternalStore } from 'react'
import { isMuted, onMusicChange, setMuted } from '../lib/music'
import { IconBtn } from './kit'

// Mute or unmute the background music (it starts on the first click, and the choice is remembered)
export default function MusicButton({ className = '' }: { className?: string }) {
  const muted = useSyncExternalStore(onMusicChange, isMuted)
  return <IconBtn icon={muted ? 'musicOff' : 'music'} label={muted ? 'Music off (click to play)' : 'Mute music'} active={!muted} className={className} onClick={() => setMuted(!muted)} />
}
