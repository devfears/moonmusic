import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { Sphere, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Group, Mesh, Vector3 } from 'three';

// Add this at the top of your file to enable GLB model loading
useGLTF.preload('/path/to/your/model.glb'); // You'll replace this with your actual model path

const MOON_RADIUS = 3;
const GRAVITY_STRENGTH = 0.02;
const REPULSION_STRENGTH = 0.3;
const DAMPING = 0.95;
const MOUSE_INFLUENCE_RADIUS = 4;
const OBJECT_SPACING = 0.6;

interface FloatingObjectProps {
  position: [number, number, number];
  index: number;
  type: 'box' | 'sphere' | 'disk';
  allObjects: Vector3[];
}

const calculateDistance = (pos1: Vector3, pos2: Vector3) => pos1.distanceTo(pos2);

// Example of how to use a GLB model
const Model = ({ url, scale = 1 }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={scale} />;
};

const FloatingObject = ({ position, index, type, allObjects }: FloatingObjectProps) => {
  const meshRef = useRef<Mesh>(null);
  const velocityRef = useRef(new Vector3(0, 0, 0));
  const targetPositionRef = useRef(new Vector3(...position));
  const [isHovered, setIsHovered] = useState(false);
  const { mouse, viewport } = useThree();

  const { scale } = useSpring({
    scale: isHovered ? 1.1 : 1,
    config: { tension: 300, friction: 10 },
  });

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...position);
    }
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const velocity = velocityRef.current;
    const moonCenter = new Vector3(0, 0, 0);
    const objectPosition = mesh.position;
    
    const mousePosition = new Vector3(
      (mouse.x * viewport.width) / 2,
      (mouse.y * viewport.height) / 2,
      0
    );
    
    const distanceToMoon = calculateDistance(objectPosition, moonCenter);
    const distanceToMouse = calculateDistance(objectPosition, mousePosition);
    
    velocity.multiplyScalar(DAMPING);
    
    if (distanceToMoon > MOON_RADIUS) {
      const gravityDirection = moonCenter.clone().sub(objectPosition).normalize();
      velocity.add(gravityDirection.multiplyScalar(GRAVITY_STRENGTH));
    }
    
    if (distanceToMouse < MOUSE_INFLUENCE_RADIUS) {
      const repulsionDirection = objectPosition.clone().sub(mousePosition).normalize();
      const repulsionStrength = REPULSION_STRENGTH * (1 - distanceToMouse / MOUSE_INFLUENCE_RADIUS);
      velocity.add(repulsionDirection.multiplyScalar(repulsionStrength));
    }
    
    allObjects.forEach((otherPos, i) => {
      if (i !== index) {
        const distanceToObject = calculateDistance(objectPosition, otherPos);
        if (distanceToObject < OBJECT_SPACING) {
          const avoidanceDirection = objectPosition.clone().sub(otherPos).normalize();
          velocity.add(avoidanceDirection.multiplyScalar(0.02));
        }
      }
    });
    
    mesh.position.add(velocity);
    
    if (distanceToMoon < MOON_RADIUS + 0.5) {
      const normal = objectPosition.clone().normalize();
      const targetPos = normal.multiplyScalar(MOON_RADIUS + 0.5);
      mesh.position.lerp(targetPos, 0.2);
      velocity.multiplyScalar(0.8);
    }

    allObjects[index].copy(mesh.position);
  });

  const getGeometry = () => {
    switch (type) {
      case 'box':
        return <boxGeometry args={[0.6, 0.1, 0.6]} />;
      case 'sphere':
        return <sphereGeometry args={[0.2, 32, 32]} />;
      case 'disk':
        return <cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />;
    }
  };

  return (
    <animated.mesh
      ref={meshRef}
      scale={scale}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      {getGeometry()}
      <meshStandardMaterial 
        color={isHovered ? '#00ff00' : '#ffffff'} 
        metalness={0.6}
        roughness={0.2}
        emissive={isHovered ? '#00ff00' : '#ffffff'}
        emissiveIntensity={isHovered ? 0.4 : 0.1}
      />
    </animated.mesh>
  );
};

const Moon = () => {
  const moonRef = useRef<Group>(null);
  
  useFrame(() => {
    if (moonRef.current) {
      moonRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group ref={moonRef}>
      <Sphere args={[MOON_RADIUS, 64, 64]}>
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.2}
          roughness={0.6}
          emissive="#404040"
          emissiveIntensity={0.2}
        />
      </Sphere>
    </group>
  );
};

const Scene = () => {
  const [objectPositions] = useState(() => {
    const positions: Vector3[] = [];
    const totalObjects = 48;
    
    for (let layer = 0; layer < 3; layer++) {
      const objectsInLayer = Math.floor(totalObjects / 3);
      const layerOffset = layer * 1.5;
      
      for (let i = 0; i < objectsInLayer; i++) {
        const angle = (i / objectsInLayer) * Math.PI * 2;
        const radius = 5 + Math.random() * 2;
        const y = (Math.random() - 0.5) * 4 + layerOffset;
        positions.push(new Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ));
      }
    }
    return positions;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#ffffff" />
      
      <Moon />
      
      {objectPositions.map((position, index) => (
        <FloatingObject
          key={index}
          position={[position.x, position.y, position.z]}
          index={index}
          type={index % 3 === 0 ? 'box' : index % 3 === 1 ? 'sphere' : 'disk'}
          allObjects={objectPositions}
        />
      ))}
    </>
  );
};

export default Scene;