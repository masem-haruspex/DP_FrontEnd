import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export default function Camera() {
	const { camera, gl: { domElement } } = useThree();
	const controlsRef = useRef<any>(null);

	return (
		<OrbitControls
		ref={controlsRef}
		camera={camera}
		domElement={domElement}
		enablePan={false}
		target={[0, 0, 0]}
		mouseButtons={{
			LEFT: THREE.MOUSE.ROTATE,
				MIDDLE: THREE.MOUSE.DOLLY,
				RIGHT: THREE.MOUSE.ROTATE,
		}}
		// Additional performance options:
		enableDamping={true} // Smooth camera movement
		dampingFactor={0.05} // Lower values = smoother but more CPU intensive
		/>
	);
}

//export default function Camera() {
//	const { camera } = useThree();
//
//	useEffect(() => {
//		camera.position.set(0, 10, 100);
//		camera.lookAt(0, 0, 0);
//		//camera.fov = 50;
//		camera.near = 0.1;
//		camera.far = 1000;
//		camera.updateProjectionMatrix();
//	}, [camera]);
//
//	return null;
//}
