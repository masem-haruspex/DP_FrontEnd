// AnimatedObject.tsx - Fixed version
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";
import * as THREE from "three";
import { getSharedDracoLoader } from '../pianoHelpers';

const DEBUG = false;

export default function AnimatedObject({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  startFrame = 0,
  shouldAnimate = true
}: {
  url: string;
  position?: [number, number, number];
  scale?: number;
  startFrame?: number;
  endFrame?: number;
  shouldAnimate?: boolean;
  rotation: [number, number, number]
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [gltf, setGltf] = useState<any>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<THREE.AnimationAction[]>([]);
  const animationStartTimeRef = useRef<number | null>(null);

  // Animation settings
  const fps = 24;

  useEffect(() => {
    if(DEBUG) console.log(`[ANIMATED OBJECT] Loading: ${url}`);
    //setLoading(true);

    const loader = new GLTFLoader();
    const dracoLoader = getSharedDracoLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (loaded) => {
        if(DEBUG) console.log(`[ANIMATED OBJECT] ✅ Loaded: ${url}`, loaded);
        console.log('Animations found:', loaded.animations.length);
        console.log('Animation names:', loaded.animations.map((anim: any) => anim.name));

        setGltf(loaded);
        //setLoading(false);

        if (shouldAnimate && loaded.animations?.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(loaded.scene);
          actionsRef.current = []; // Clear previous actions

          // Play ALL animations, not just the first one
          loaded.animations.forEach((clip: THREE.AnimationClip, index: number) => {
            const action = mixerRef.current!.clipAction(clip);

            // Configure for non-repeating animation
            action.setLoop(THREE.LoopOnce, 1); // Play once and stop
            action.clampWhenFinished = true; // Stay at the last frame

            // For title animation with custom frame range
            if (url.includes('title') && startFrame !== 0) {
              const startTime = startFrame / fps;
              // Store the start time so we can offset the animation in useFrame
              animationStartTimeRef.current = startTime;
              if(DEBUG) console.log(`[ANIMATED OBJECT] Title animation will start at frame ${startFrame} (time: ${startTime}s)`);
            } else {
              animationStartTimeRef.current = 0;
            }

            action.play();
            actionsRef.current.push(action);

            if(DEBUG) console.log(`[ANIMATED OBJECT] Animation ${index} started: ${clip.name}, duration: ${clip.duration}`);
          });

          if(DEBUG) console.log(`[ANIMATED OBJECT] Total animations playing: ${actionsRef.current.length}`);
        } else {
          if(DEBUG) console.log(`[ANIMATED OBJECT] No animations or shouldAnimate=false`);
        }
      },
      undefined,
      (error) => {
        console.error(`[ANIMATED OBJECT] ❌ Failed to load: ${url}`, error);
        //setLoading(false);
      }
    );
  }, [url, shouldAnimate, startFrame, fps]);

  useFrame((_, delta) => {
    if (!mixerRef.current || !shouldAnimate) return;

    // For title animation with custom start frame, we need to manually control the time
    if (url.includes('title') && animationStartTimeRef.current !== null) {
      // Get the current time from the first action
      const action = actionsRef.current[0];
      if (action) {
        const currentTime = action.time;

        // If we haven't reached the start frame yet, fast-forward
        if (currentTime < animationStartTimeRef.current) {
          action.time = animationStartTimeRef.current;
        }
      }
    }

    // Update the animation mixer
    mixerRef.current.update(delta);

    if(DEBUG && Math.random() < 0.01 && url.includes('title')) {
      const action = actionsRef.current[0];
      if (action) {
        console.log(`[ANIMATED OBJECT] Title animation time: ${action.time.toFixed(2)}s`);
      }
    }
  });

  if (!gltf) return null;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={gltf.scene} />
    </group>
  );
}
