//import { useGLTF } from "@react-three/drei";
//
//interface IProps {
//    url: string;
//    position: number[];
//}
//
//export default function Key({ url, position }: IProps) {
//    const { scene } = useGLTF(url);
//    return <primitive object={scene} position={position} />;
//}

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';

interface KeyProps {
    gltf: any;
    position: [number, number, number];
}

export default function Key({ gltf, position }: KeyProps) {
    const ref = useRef<Group>(null);
    
    useFrame(() => {
        // Animation logic if needed
    });

    return (
        <group ref={ref} position={position}>
            <primitive object={gltf.scene.clone()} />
        </group>
    );
}