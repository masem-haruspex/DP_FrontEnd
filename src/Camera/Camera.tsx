// Camera/Camera.tsx
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const DEBUG = false;

interface CameraProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  transitionDuration?: number;
}

export default function Camera({
  position = [0, 0, 1],
  rotation = [0, 0, 0],
  transitionDuration = 2.0 * 1000 // 2 sec
}: CameraProps) {
  const { camera } = useThree();
  const animationRef = useRef<number>(null);
  const startPositionRef = useRef(new THREE.Vector3());
  const startRotationRef = useRef(new THREE.Euler());
  const targetPositionRef = useRef(new THREE.Vector3());
  const targetRotationRef = useRef(new THREE.Euler());
  const startTimeRef = useRef<number>(null);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      startPositionRef.current.copy(camera.position);
      startRotationRef.current.copy(camera.rotation);

      targetPositionRef.current.set(...position);
      targetRotationRef.current.set(...rotation);

      startTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current!;
        const progress = Math.min(elapsed / transitionDuration, 1);

        const easedProgress = easeInOutCubic(progress);

        camera.position.lerpVectors(
          startPositionRef.current,
          targetPositionRef.current,
          easedProgress
        );

        const currentRotation = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion().slerpQuaternions(
            new THREE.Quaternion().setFromEuler(startRotationRef.current),
            new THREE.Quaternion().setFromEuler(targetRotationRef.current),
            easedProgress
          )
        );

        camera.rotation.copy(currentRotation);
        camera.updateMatrixWorld();

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          if(DEBUG) console.log('📷 Camera Transition Complete:');
          if(DEBUG) console.log('Final Position:', {
             x: camera.position.x.toFixed(3),
             y: camera.position.y.toFixed(3),
             z: camera.position.z.toFixed(3)
           });
          if(DEBUG) console.log('Final Rotation:', {
            x: camera.rotation.x.toFixed(3),
            y: camera.rotation.y.toFixed(3),
            z: camera.rotation.z.toFixed(3)
          });
        }
      };

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [camera, position, rotation, transitionDuration]);

  return null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

//// DONT REMOVE THIS, this can be used for manually orbiting and positioning the camera with your mouse and then clicking "p" on the keyboard to print the position & rotation
//// Camera/Camera.tsx
//import { useThree } from "@react-three/fiber";
//import { useEffect, useState, useRef } from "react";
//import * as THREE from "three";
//import { PointerLockControls } from "@react-three/drei";
//
//interface CameraProps {
//  rotation?: [number, number, number];
//  enableControls?: boolean;
//  logPosition?: boolean;
//  initialPosition?: [number, number, number];
//}
//
//export default function Camera({
//  rotation = [0, 0, 0],
//  enableControls = true,
//  logPosition = true,
//  initialPosition
//}: CameraProps) {
//  const { camera, gl } = useThree();
//  const [isInitialized, setIsInitialized] = useState(false);
//  const controlsRef = useRef<any>(null);
//
//  const logCameraPosition = () => {
//    const position = camera.position;
//    const rotation = camera.rotation;
//
//    console.log('📷 Camera Position:');
//    console.log('Position:', {
//      x: position.x.toFixed(3),
//      y: position.y.toFixed(3),
//      z: position.z.toFixed(3)
//    });
//    console.log('Rotation:', {
//      x: rotation.x.toFixed(3),
//      y: rotation.y.toFixed(3),
//      z: rotation.z.toFixed(3)
//    });
//    console.log('Copyable position array:');
//    console.log(`[${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)}]`);
//
//    console.log('As Vector3:');
//    console.log(`new THREE.Vector3(${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)})`);
//  };
//
//  useEffect(() => {
//    if (camera instanceof THREE.PerspectiveCamera && !isInitialized) {
//      if (initialPosition) {
//        camera.position.set(...initialPosition);
//      } else {
//        camera.position.set(-0.755, -0.100, -1.690);
//      }
//
//      if (rotation) {
//        camera.rotation.set(rotation[0], rotation[1], rotation[2]);
//      }
//
//      camera.updateMatrixWorld();
//      setIsInitialized(true);
//
//      if (logPosition) {
//        setTimeout(() => {
//          console.log('🎬 Initial Camera Position:');
//          logCameraPosition();
//        }, 100);
//      }
//    }
//  }, [camera, rotation, logPosition, initialPosition, isInitialized]);
//
//  useEffect(() => {
//    const handleKeyPress = (event: KeyboardEvent) => {
//      if ((event.key === 'p' || event.key === 'P') && logPosition) {
//        logCameraPosition();
//      }
//
//      if ((event.key === 'l' || event.key === 'L') && controlsRef.current) {
//        if (controlsRef.current.isLocked) {
//          controlsRef.current.unlock();
//        } else {
//          controlsRef.current.lock();
//        }
//      }
//    };
//
//    window.addEventListener('keydown', handleKeyPress);
//    return () => window.removeEventListener('keydown', handleKeyPress);
//  }, [logPosition]);
//
//  return (
//    <>
//      {enableControls && (
//        <PointerLockControls
//          ref={controlsRef}
//          domElement={gl.domElement}
//          onChange={() => {
//            if (logPosition && controlsRef.current?.isLocked) {
//              requestAnimationFrame(() => {
//                logCameraPosition();
//              });
//            }
//          }}
//        />
//      )}
//    </>
//  );
//}
