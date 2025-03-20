import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import Scene from './components/Scene';

function App() {
  return (
    <div className="h-screen w-screen bg-black">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75 }}
        style={{ background: '#000000' }}
      >
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;