// Preloader/Preloader.tsx
import { useEffect, useState } from 'react';
import { GLTFLoader } from 'three-stdlib';
import { useSetAtom } from 'jotai';
import { modelsAtom } from '../atoms/models';
import { Text } from '@react-three/drei';
import { getSharedDracoLoader } from '../lib/pianoHelpers';
import * as THREE from 'three';

const DEBUG = false;

interface PreloaderProps {
  onLoaded?: () => void;
}

export default function Preloader({ onLoaded }: PreloaderProps) {
  const [error, setError] = useState<string | null>(null);
  const setModels = useSetAtom(modelsAtom);
  const [hasStarted, setHasStarted] = useState(false);

  const modelUrls = [
    { url: '/models/loading/cat_black.glb', id: 'loading-cat-black' },
    { url: '/models/loading/cat_tuxedo.glb', id: 'loading-cat-tuxedo' },
    { url: '/models/loading/piano.glb', id: 'loading-piano' },
    { url: '/models/loading/title.glb', id: 'loading-title' },
    { url: '/models/note.glb', id: 'note-model' },
    { url: '/models/casio_basis.glb', id: 'casio-basis' },
    { url: '/models/midiplus_basis.glb', id: 'midiplus-basis' },
    ...Array.from({ length: 52 }, (_, i) => ({
      url: `/models/white_keys/white_keys.${(i + 1).toString().padStart(3, '0')}.glb`,
      id: `white-key-${(i + 1).toString().padStart(3, '0')}`
    })),
    ...Array.from({ length: 36 }, (_, i) => ({
      url: `/models/black_keys/black_keys.${(i + 1).toString().padStart(3, '0')}.glb`,
      id: `black-key-${(i + 1).toString().padStart(3, '0')}`
    }))
  ];

  useEffect(() => {
    if (hasStarted) return;
    setHasStarted(true);

    if(DEBUG) console.log('[PRELOADER] Starting to load', modelUrls.length, 'models');

    const completedCount = { current: 0 };
    const loadedModels: any[] = new Array(modelUrls.length);
    const totalModels = modelUrls.length;
    const activeLoaders = new Set();

    const loader = new GLTFLoader();
    const dracoLoader = getSharedDracoLoader();
    loader.setDRACOLoader(dracoLoader);

    const loadModel = (url: string, index: number, assetId: string) => {
      if(DEBUG) console.log(`[PRELOADER] Loading ${assetId} (${index + 1}/${totalModels})`);

      return new Promise<void>((resolve, reject) => {
        activeLoaders.add(assetId);

        loader.load(
          url,
          (gltf) => {
            if (DEBUG) {
              console.log(`=== GLTF DEBUG FOR: ${assetId} ===`);
              console.log('Full GLTF structure:', gltf);
              console.log('Number of animations:', gltf.animations.length);
              console.log('Animation names:', gltf.animations.map((anim: THREE.AnimationClip) => anim.name));
              console.log('Animation durations:', gltf.animations.map((anim: THREE.AnimationClip) => anim.duration));
              console.log('Animation tracks:', gltf.animations.map((anim: THREE.AnimationClip) => ({
                name: anim.name,
                tracks: anim.tracks.length,
                duration: anim.duration
              })));

              console.log('Scene children count:', gltf.scene.children.length);

              gltf.scene.traverse((child) => {
                if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
                  console.log('SkinnedMesh found:', child);
                  console.log('Skeleton:', (child as THREE.SkinnedMesh).skeleton);
                }
                if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  if (mesh.geometry) {
                    console.log('Mesh found with geometry:', mesh.geometry.attributes);
                  }
                }
                if (child.animations && child.animations.length > 0) {
                  console.log('Object with animations:', child);
                }
              });

              gltf.animations.forEach((anim: THREE.AnimationClip, idx: number) => {
                console.log(`Animation ${idx} (${anim.name}) tracks:`, anim.tracks.length);
                if (anim.tracks.length > 0) {
                  console.log('First track:', anim.tracks[0]);
                }
              });
              console.log(`=== END DEBUG FOR: ${assetId} ===`);
            }

            loadedModels[index] = gltf;
            completedCount.current += 1;
            activeLoaders.delete(assetId);

            const progress = Math.floor((completedCount.current / totalModels) * 100);
            if(DEBUG) console.log(`[PRELOADER] ✅ ${assetId} loaded. Progress: ${progress}% (${completedCount.current}/${totalModels})`);
            resolve();
          },
          undefined,
          (error) => {
            activeLoaders.delete(assetId);
            console.error(`[PRELOADER] ❌ Failed to load ${assetId}:`, error);
            setError(`Failed to load model: ${assetId}`);
            reject(error);
          }
        );
      });
    };

    const promises = modelUrls.map((model, index) =>
      loadModel(model.url, index, model.id)
    );

    Promise.allSettled(promises).then((results) => {
      const failed = results.filter(result => result.status === 'rejected');
      if(DEBUG) console.log(`[PRELOADER] All models processed. Failed: ${failed.length}, Success: ${results.length - failed.length}`);

      if (failed.length > 0) {
        console.error('[PRELOADER] Some models failed to load');
        setError(`${failed.length} models failed to load. Check console for details.`);
        return;
      }

      try {
        const [
          catBlackModel,
          catTuxedoModel,
          pianoModel,
          titleModel,
          noteModel, 
          casioBasisModel, 
          midiplusBasisModel, 
          ...keyModels
        ] = loadedModels;
        const whiteKeyModels = keyModels.slice(0, 52);
        const blackKeyModels = keyModels.slice(52);

        if (!noteModel?.scene || !casioBasisModel?.scene) {
          throw new Error('Critical models (note.glb or casio_basis.glb) failed to load');
        }

        if(DEBUG) console.log('[PRELOADER] ✅ All models loaded successfully, setting atom');
        setModels({
          catBlackModel,
          catTuxedoModel,
          pianoModel,
          titleModel,
          whiteKeyModels,
          blackKeyModels,
          noteModel,
          casioBasisModel,
          midiplusBasisModel,
        });

        onLoaded?.();
        if(DEBUG) console.log('[PRELOADER] ✅ onLoaded callback called');
      } catch (e) {
        console.error('[PRELOADER] Model organization error:', e);
        setError(`Error: ${e instanceof Error ? e.message : 'Failed to process models'}`);
      }
    });

    return () => {
    };
  }, [hasStarted, onLoaded, setModels, modelUrls]);

  if (error) {
    return (
      <group position={[0, 0, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.3}
          color="red"
          anchorX="center"
          anchorY="middle"
        >
          {error}
        </Text>
        <Text
          position={[0, -0.5, 0]}
          fontSize={0.2}
          color="orange"
          anchorX="center"
          anchorY="middle"
        >
          Check console for details
        </Text>
      </group>
    );
  }

  return null;
}
