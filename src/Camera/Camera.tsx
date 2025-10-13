import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export default function Camera() {
	const { camera, gl: { domElement } } = useThree();
	const controlsRef = useRef<any>(null);

    useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      // Convert 50mm focal length to FOV
      // For a standard 35mm film/sensor (36x24mm), the formula is:
      // FOV = 2 * arctan((sensor width) / (2 * focal length)) * (180 / PI)
      const filmWidth = 36; // Standard 35mm film width
      const focalLength = 50; // 50mm focal length
      const fov = 2 * Math.atan(filmWidth / (2 * focalLength)) * (180 / Math.PI);

      camera.fov = fov; // This should be approximately 39.6 degrees
      camera.updateProjectionMatrix();
    }
  }, [camera]);


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
