import { useStore } from './store'
import Landing from './screens/Landing'
import Intro from './screens/Intro'
import Reject from './screens/Reject'
import Upload from './screens/Upload'
import World from './world/World'
export default function App() {
  const screen = useStore((s) => s.screen)
  return (
    <>
      {screen === 'landing' && <Landing />}
      {screen === 'intro' && <Intro />}
      {screen === 'reject' && <Reject />}
      {screen === 'upload' && <Upload />}
      {screen === 'world' && <World />}
      <div className="grain" />
    </>
  )
}
