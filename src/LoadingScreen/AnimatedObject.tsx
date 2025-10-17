// LoadingScreen/AnimatedObject.tsx
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";
import * as THREE from "three";
import { getSharedDracoLoader } from '../lib/pianoHelpers';

const DEBUG = false;

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
  startAnimation?: boolean;
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
  startAnimation = true,
}: AnimatedObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [gltf, setGltf] = useState<any>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<{[key: string]: THREE.AnimationAction}>({});
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const [hasStartedAnimations, setHasStartedAnimations] = useState(false);

  const filename = url.split('/').pop();

  useEffect(() => {
    if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Component mounted with startAnimation:`, startAnimation);
    if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Starting model load...`);

    const loader = new GLTFLoader();
    const dracoLoader = getSharedDracoLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (loaded) => {
        if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] ✅ Model loaded successfully`);
        if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Animations found:`, loaded.animations.length);
        if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Animation names:`, loaded.animations.map((a: THREE.AnimationClip) => a.name));
        if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Current startAnimation value:`, startAnimation);

        setGltf(loaded);

      },
      undefined,
      (error) => {
        console.error(`[ANIMATED OBJECT ${filename}] ❌ Failed to load model:`, error);
      }
    );
  }, [url, filename]);

  useEffect(() => {
    if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Animation trigger check:`, {
      hasGltf: !!gltf,
      shouldAnimate,
      startAnimation,
      hasStartedAnimations
    });

    if (!gltf) {
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Cannot start animations - model not loaded yet`);
      return;
    }

    if (!shouldAnimate) {
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Animations disabled by shouldAnimate prop`);
      return;
    }

    if (!startAnimation) {
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Animations waiting for startAnimation to become true`);
      return;
    }

    if (hasStartedAnimations) {
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Animations already started, skipping`);
      return;
    }

    if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] 🎬 Starting animations!`);
    setHasStartedAnimations(true);

    mixerRef.current = new THREE.AnimationMixer(gltf.scene);
    actionsRef.current = {};

    gltf.animations.forEach((clip: THREE.AnimationClip) => {
      const action = mixerRef.current!.clipAction(clip);
      actionsRef.current[clip.name] = action;
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Created action for:`, clip.name);
    });

    if (introAnimationName && actionsRef.current[introAnimationName]) {
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Starting intro animation:`, introAnimationName);
      const introAction = actionsRef.current[introAnimationName];

      introAction.setLoop(THREE.LoopOnce, 1);
      introAction.clampWhenFinished = true;

      mixerRef.current.addEventListener('finished', (e) => {
        if (e.action === introAction) {
          if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Intro animation complete:`, introAnimationName);
          onIntroComplete?.();

          if (shouldLoop && loopAnimationName && actionsRef.current[loopAnimationName]) {
            if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Starting loop animation:`, loopAnimationName);
            const loopAction = actionsRef.current[loopAnimationName];
            loopAction.setLoop(THREE.LoopRepeat, Infinity);
            loopAction.reset().play();
            currentActionRef.current = loopAction;
          }
        }
      });

      introAction.play();
      currentActionRef.current = introAction;
    }
    else if (shouldLoop && loopAnimationName && actionsRef.current[loopAnimationName]) {
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Starting loop animation immediately:`, loopAnimationName);
      const loopAction = actionsRef.current[loopAnimationName];
      loopAction.setLoop(THREE.LoopRepeat, Infinity);
      loopAction.play();
      currentActionRef.current = loopAction;
    }
    else if (gltf.animations.length > 0) {
      const firstAnimation = gltf.animations[0].name;
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Starting single animation:`, firstAnimation);
      const action = actionsRef.current[firstAnimation];
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      currentActionRef.current = action;
    } else {
      if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] No animations to play`);
    }
  }, [gltf, shouldAnimate, startAnimation, introAnimationName, loopAnimationName, shouldLoop, onIntroComplete, hasStartedAnimations, filename]);

  useFrame((_, delta) => {
    if (!mixerRef.current || !shouldAnimate || !startAnimation) return;
    mixerRef.current.update(delta * speed);
  });

  if (!gltf) {
    if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Rendering null - model not loaded`);
    return null;
  }

  if(DEBUG) console.log(`[ANIMATED OBJECT ${filename}] Rendering model`);
  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={gltf.scene} />
    </group>
  );
}
