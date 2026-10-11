import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { startMusicOnFirstTouch } from './lib/music'

startMusicOnFirstTouch()

createRoot(document.getElementById('root')!).render(<App />)
