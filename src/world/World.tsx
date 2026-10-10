import { Canvas } from '@react-three/fiber'
export default function World() {
  return (
    <Canvas>
      <ambientLight /><mesh><boxGeometry /><meshStandardMaterial color="#F2B544" /></mesh>
    </Canvas>
  )
}
