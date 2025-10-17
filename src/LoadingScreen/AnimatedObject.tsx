// LoadingScreen/AnimatedObject.tsx
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";
import * as THREE from "three";
import { getSharedDracoLoader } from '../lib/pianoHelpers';

const DEBUG = true;

interface AnimatedObjectProps {
  url: string;
  position?: [number, number, number];
  scale?: number;
  rotation: [number, number, number];
  shouldAnimate?: boolean;
  speed?: number;
  introAnimationName?: string;
  loopAnimationName?: string;
  onIntroComplete?: () => void;
  shouldLoop?: boolean;
}

export default function AnimatedObject({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  shouldAnimate = true,
  speed = 1,
  introAnimationName,
  loopAnimationName,
  onIntroComplete,
  shouldLoop = false,
}: AnimatedObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [gltf, setGltf] = useState<any>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<{[key: string]: THREE.AnimationAction}>({});
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if(DEBUG) console.log(`[ANIMATED OBJECT] Loading: ${url}`);

    const loader = new GLTFLoader();
    const dracoLoader = getSharedDracoLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (loaded) => {
        if(DEBUG) console.log(`[ANIMATED OBJECT] ✅ Loaded: ${url}`);
        if(DEBUG) console.log('Animations found:', loaded.animations.length);

        setGltf(loaded);

        if (shouldAnimate && loaded.animations?.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(loaded.scene);
          actionsRef.current = {};

          // Create actions for all animations
          loaded.animations.forEach((clip: THREE.AnimationClip) => {
            const action = mixerRef.current!.clipAction(clip);
            actionsRef.current[clip.name] = action;
          });

          // Start with intro animation if specified
          if (introAnimationName && actionsRef.current[introAnimationName]) {
            const introAction = actionsRef.current[introAnimationName];

            introAction.setLoop(THREE.LoopOnce, 1);
            introAction.clampWhenFinished = true;

            // Set up completion callback - this should fire at the right time
            mixerRef.current.addEventListener('finished', (e) => {
              if (e.action === introAction) {
                if(DEBUG) console.log(`[ANIMATED OBJECT] Intro animation complete: ${introAnimationName}`);
                onIntroComplete?.();

                // Start loop animation if available
                if (shouldLoop && loopAnimationName && actionsRef.current[loopAnimationName]) {
                  const loopAction = actionsRef.current[loopAnimationName];
                  loopAction.setLoop(THREE.LoopRepeat, Infinity);
                  loopAction.reset().play();
                  currentActionRef.current = loopAction;
                  if(DEBUG) console.log(`[ANIMATED OBJECT] Started loop animation: ${loopAnimationName}`);
                }
              }
            });

            introAction.play();
            currentActionRef.current = introAction;
            if(DEBUG) console.log(`[ANIMATED OBJECT] Started intro animation: ${introAnimationName}`);
          }
          // If no intro specified but loop is requested, start loop immediately
          else if (shouldLoop && loopAnimationName && actionsRef.current[loopAnimationName]) {
            const loopAction = actionsRef.current[loopAnimationName];
            loopAction.setLoop(THREE.LoopRepeat, Infinity);
            loopAction.play();
            currentActionRef.current = loopAction;
            if(DEBUG) console.log(`[ANIMATED OBJECT] Started loop animation immediately: ${loopAnimationName}`);
          }
          // For objects with only one animation (like title), just play it
          else if (loaded.animations.length > 0) {
            const action = actionsRef.current[loaded.animations[0].name];
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
            currentActionRef.current = action;
            if(DEBUG) console.log(`[ANIMATED OBJECT] Started single animation: ${loaded.animations[0].name}`);
          }
        } else {
          if(DEBUG) console.log(`[ANIMATED OBJECT] No animations or shouldAnimate=false`);
        }
      },
      undefined,
      (error) => {
        console.error(`[ANIMATED OBJECT] ❌ Failed to load: ${url}`, error);
      }
    );
  }, [url, shouldAnimate, introAnimationName, loopAnimationName, shouldLoop, onIntroComplete, speed]);

  useFrame((_, delta) => {
    if (!mixerRef.current || !shouldAnimate) return;
    mixerRef.current.update(delta * speed);
  });

  if (!gltf) return null;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={gltf.scene} />
    </group>
  );
}
