// Keyboard/MusicNote.tsx
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface MusicNoteProps {
    initialPosition: [number, number, number];
    onExpired: () => void;
    lifespan: number;
    glowColor?: string;
    glowIntensity?: number;
    gltf: any;
}

export default function MusicNote({ 
    initialPosition, 
    onExpired, 
    lifespan, 
    glowColor = '#ffef00', 
    glowIntensity = 1,
    gltf 
}: MusicNoteProps) {
    const groupRef = useRef<THREE.Group>(null);
    const velocity = useRef(10.5 + Math.random() * 0.3);
    const swayPhase = useRef(Math.random() * Math.PI * 2);
    const swaySpeed = useRef(1 + Math.random() * 2);
    const swayAmount = useRef(0.05 + Math.random() * 0.05);
    
    const rotationSpeedX = useRef(0.5 + Math.random() * 1);
    const rotationSpeedY = useRef(0.3 + Math.random() * 0.7);
    const rotationSpeedZ = useRef(0.2 + Math.random() * 0.5);
    
    const glowMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(glowColor),
            emissive: new THREE.Color(glowColor),
            emissiveIntensity: glowIntensity,
            toneMapped: false,
            transparent: true,
            opacity: 0.9
        });
    }, [glowColor, glowIntensity]);

    useEffect(() => {
        if (gltf && groupRef.current) {
            const clonedScene = gltf.scene.clone();
            clonedScene.traverse((child: unknown) => {
                if (child instanceof THREE.Mesh) {
                    child.material = glowMaterial;
                }
            });
            groupRef.current.add(clonedScene);
        }
    }, [gltf, glowMaterial]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        
        groupRef.current.position.y += velocity.current * delta;
        swayPhase.current += swaySpeed.current * delta;
        groupRef.current.position.x = initialPosition[0] + Math.sin(swayPhase.current) * swayAmount.current;
        
        groupRef.current.rotation.x += rotationSpeedX.current * delta * 0.1;
        groupRef.current.rotation.y += rotationSpeedY.current * delta * 0.5;
        groupRef.current.rotation.z += rotationSpeedZ.current * delta * 0.1;
        
        groupRef.current.rotation.z += Math.sin(swayPhase.current * 1.5) * 0.2 * delta;
    });

    useEffect(() => {
        const timer = setTimeout(() => onExpired(), lifespan);
        return () => clearTimeout(timer);
    }, [lifespan, onExpired]);

    return (
        <group ref={groupRef} position={initialPosition} scale={[0.5, 0.5, 0.5]} />
    );
}

export function BloomScene({ children }: { children: ReactNode }) {
  const { size } = useThree();

  return (
    <>
      {children}
      <EffectComposer>
        <Bloom
          intensity={1.2}
          kernelSize={3}
          luminanceThreshold={0}
          luminanceSmoothing={0.7}
          height={size.height}
        />
      </EffectComposer>
    </>
    );
}
