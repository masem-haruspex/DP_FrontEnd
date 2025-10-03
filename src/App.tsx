// src/App.tsx
import { Stats } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import Camera from './Camera/Camera';
import { BloomScene } from "./Keyboard/MusicNote";
import LoadingScreen from './LoadingScreen/LoadingScreen';
import Preloader from './Preloader/Preloader';
import MainMenu from './Menu/MainMenu';
import { degreesToRad } from './pianoHelpers';
import AnimatedObject from './LoadingScreen/AnimatedObject';
import styles from './App.module.scss';
import SinglePlayer from './SinglePlayer/SinglePlayer';
import PianoKeyboard from './Keyboard/Keyboard';

const DEBUG = false;

function VisibilityController() {
  const { gl, advance } = useThree();

  useEffect(() => {
    let running = true;
    let frameId: number;

    const render = (timestamp: number) => {
      if (!running) return;
      frameId = requestAnimationFrame(render);
      advance(timestamp);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else {
        if (!running) {
          running = true;
          frameId = requestAnimationFrame(render);
        }
      }
    };

    frameId = requestAnimationFrame(render);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      running = false;
      cancelAnimationFrame(frameId);
    };
  }, [gl, advance]);

  return null;
}

export default function App() {
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showSinglePlayer, setShowSinglePlayer] = useState(false);
  const [preloaderStarted, setPreloaderStarted] = useState(false);
  const [debug, setDebug] = useState(false);

  const initializeAudio = useCallback(async () => {
    try {
      const Tone = (await import('tone')) as unknown as typeof import('tone');
      const { Piano } = await import('@tonejs/piano');

      if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
      } else if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      const piano = new Piano({
        velocities: 3,
        minNote: 21,
        maxNote: 108
      });

      await piano.load();
      piano.dispose();
      setAudioInitialized(true);
    } catch (error) {
      if (DEBUG) console.warn('Audio initialization failed, proceeding without sound:', error);
      setAudioInitialized(true);
    }
  }, []);

  const handleEnterClick = async () => {
    await initializeAudio();
    setHasUserInteracted(true);
  };

  const handleLoadingComplete = useCallback(() => {
    if (DEBUG) console.log('[APP] Loading complete, showing main menu');
    setShowMainMenu(true);
  }, []);

  const handleSinglePlayer = () => {
    setShowMainMenu(false);
    setShowSinglePlayer(true);
  };

  const handleBackToMenu = () => {
    setShowSinglePlayer(false);
    setShowMainMenu(true);
  };

  useEffect(() => {
    if (hasUserInteracted && !preloaderStarted) {
      setPreloaderStarted(true);
    }
  }, [hasUserInteracted, preloaderStarted]);

  const showAnimatedModels = hasUserInteracted && !showSinglePlayer;

  const isLoading = hasUserInteracted && (!modelsLoaded || !animationComplete);

  useEffect(() => {
    if (DEBUG) {
      console.log('[APP] Checking completion status:', {
        modelsLoaded,
        animationComplete,
        audioInitialized
      });
    }

    if (modelsLoaded && animationComplete && audioInitialized && !showMainMenu) {
      if (DEBUG) console.log('[APP] All conditions met, calling handleLoadingComplete');
      handleLoadingComplete();
    }
  }, [modelsLoaded, animationComplete, audioInitialized, showMainMenu, handleLoadingComplete]);

  if (!hasUserInteracted) {
    return (
      <div className={styles.splashScreen} onClick={handleEnterClick}>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>

        <div className={styles.splashContent}>
          <h1>Duo Piano</h1>
          <p>Click anywhere to start</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      {preloaderStarted && !modelsLoaded && (
        <Preloader
          onLoaded={() => setModelsLoaded(true)}
          onProgress={setLoadingProgress}
        />
      )}

      <Canvas
        frameloop="demand"
        dpr={1}
        gl={{
          powerPreference: "high-performance",
            antialias: false,
            alpha: false,
            logarithmicDepthBuffer: false,
            precision: "highp",
            preserveDrawingBuffer: false,
            stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#111144');
          gl.shadowMap.enabled = false;
          gl.autoClear = true;
        }}
      >
        <SceneDebugger />
        <VisibilityController />
        <Camera />

        <BloomScene>
          {debug && <Stats />}
          <ambientLight intensity={0.9} />
          <pointLight position={[10, 10, 10]} intensity={500} />
          <pointLight position={[-20, 0, -10]} intensity={60} />

          {showAnimatedModels && (
            <group position={[-1, 0.4, 1]} rotation={[degreesToRad(25), degreesToRad(0), degreesToRad(0)]}>
              <AnimatedObject
                url="/models/loading/cat_black.glb"
                position={[3, 1, 1]}
                rotation={[0, 0, 0]}
                scale={1.2}
              />
              <AnimatedObject
                url="/models/loading/cat_tuxedo.glb"
                position={[3.2, 0.9, 0.95]}
                rotation={[0, 0, 0]}
                scale={1.2}
              />
              <AnimatedObject
                url="/models/loading/piano.glb"
                position={[3, 1, 1]}
                rotation={[degreesToRad(0), 0, 0]}
                scale={1.0}
                shouldAnimate={false}
              />
              <AnimatedObject
                url="/models/loading/title.glb"
                position={[13, 1.4, 1]}
                rotation={[0, 0, 0]}
                scale={8}
                shouldAnimate
              />
            </group>
          )}

      {showSinglePlayer && modelsLoaded && (
        <PianoKeyboard />
      )}

        </BloomScene>
      </Canvas>

      {isLoading && (
        <LoadingScreen
          progress={loadingProgress}
          audioInitialized={audioInitialized}
          modelsLoaded={modelsLoaded}
          onComplete={handleLoadingComplete}
          onAnimationComplete={() => setAnimationComplete(true)}
        />
      )}

      {showMainMenu && !showSinglePlayer && (
        <MainMenu
          onSinglePlayer={handleSinglePlayer}
          isInitializing={false}
        />
      )}

      {showSinglePlayer && modelsLoaded && (
        <SinglePlayer onBack={handleBackToMenu} />
      )}

      <button
        onClick={() => setDebug(!debug)}
        className={styles.debugButton}
      >
        {debug ? 'Hide Stats' : 'Show Stats'}
      </button>
    </div>
  );
}

function SceneDebugger() {
  const { scene } = useThree();

  useEffect(() => {
    if (DEBUG) {
      console.log('[SCENE DEBUG] Scene children count:', scene.children.length);
      scene.children.forEach((child, index) => {
        console.log(`[SCENE DEBUG] Child ${index}:`, child.name, child.type, child.visible);
      });
    }
  });

  return null;
}
//// src/App.tsx
//import { Stats } from '@react-three/drei';
//import { Canvas, useThree } from '@react-three/fiber';
//import { useCallback, useEffect, useState, lazy } from 'react';
//import Camera from './Camera/Camera';
//import { BloomScene } from "./Keyboard/MusicNote";
//import LoadingScreen from './LoadingScreen/LoadingScreen';
//import Preloader from './Preloader/Preloader';
//import MainMenu from './Menu/MainMenu';
//import { degreesToRad } from './pianoHelpers';
//import AnimatedObject from './LoadingScreen/AnimatedObject';
//import styles from './App.module.scss';
//
//const DEBUG = false;
//
//const PianoKeyboard = lazy(() => import('./Keyboard/Keyboard'));
//
//function VisibilityController() {
//  const { gl, advance } = useThree();
//
//  useEffect(() => {
//    let running = true;
//    let frameId: number;
//
//    const render = (timestamp: number) => {
//      if (!running) return;
//      frameId = requestAnimationFrame(render);
//      advance(timestamp);
//    };
//
//    const handleVisibilityChange = () => {
//      if (document.hidden) {
//        running = false;
//        cancelAnimationFrame(frameId);
//      } else {
//        if (!running) {
//          running = true;
//          frameId = requestAnimationFrame(render);
//        }
//      }
//    };
//
//    frameId = requestAnimationFrame(render);
//    document.addEventListener('visibilitychange', handleVisibilityChange);
//    return () => {
//      document.removeEventListener('visibilitychange', handleVisibilityChange);
//      running = false;
//      cancelAnimationFrame(frameId);
//    };
//  }, [gl, advance]);
//
//  return null;
//}
//
//export default function App() {
//  const [hasUserInteracted, setHasUserInteracted] = useState(false);
//  const [audioInitialized, setAudioInitialized] = useState(false);
//  const [animationComplete, setAnimationComplete] = useState(false);
//  const [modelsLoaded, setModelsLoaded] = useState(false);
//  const [loadingProgress, setLoadingProgress] = useState(0);
//  const [showMainMenu, setShowMainMenu] = useState(false);
//  const [showKeyboard, setShowKeyboard] = useState(false);
//  const [preloaderStarted, setPreloaderStarted] = useState(false);
//  const [debug, setDebug] = useState(false); // UI debug toggle (e.g., Stats)
//
//  const initializeAudio = useCallback(async () => {
//    try {
//      const Tone = (await import('tone')) as unknown as typeof import('tone');
//      const { Piano } = await import('@tonejs/piano');
//
//      if (Tone.context.state === 'suspended') {
//        await Tone.context.resume();
//      } else if (Tone.context.state !== 'running') {
//        await Tone.start();
//      }
//
//      const piano = new Piano({
//        velocities: 3,
//        minNote: 21,
//        maxNote: 108
//      });
//
//      await piano.load();
//      piano.dispose();
//      setAudioInitialized(true);
//    } catch (error) {
//      if (DEBUG) console.warn('Audio initialization failed, proceeding without sound:', error);
//      setAudioInitialized(true);
//    }
//  }, []);
//
//  const handleEnterClick = async () => {
//    await initializeAudio();
//    setHasUserInteracted(true);
//  };
//
//  const handleLoadingComplete = useCallback(() => {
//    if (DEBUG) console.log('[APP] Loading complete, showing main menu');
//    setShowMainMenu(true);
//  }, []);
//
//  const handleSinglePlayer = () => {
//    setShowMainMenu(false);
//    setShowKeyboard(true);
//  };
//
//  // Start preloader after user interaction
//  useEffect(() => {
//    if (hasUserInteracted && !preloaderStarted) {
//      setPreloaderStarted(true);
//    }
//  }, [hasUserInteracted, preloaderStarted]);
//
//  // Debug logs
//  useEffect(() => {
//    if (DEBUG) console.log(`[APP] loadingProgress: ${loadingProgress}%`);
//  }, [loadingProgress]);
//
//  useEffect(() => {
//    if (DEBUG) console.log(`[APP] modelsLoaded: ${modelsLoaded}`);
//  }, [modelsLoaded]);
//
//  // Check when all loading is complete
//  useEffect(() => {
//    if (DEBUG) {
//      console.log('[APP] Checking completion status:', {
//        modelsLoaded,
//        animationComplete,
//        audioInitialized
//      });
//    }
//
//    if (modelsLoaded && animationComplete && audioInitialized && !showMainMenu) {
//      if (DEBUG) console.log('[APP] All conditions met, calling handleLoadingComplete');
//      handleLoadingComplete();
//    }
//  }, [modelsLoaded, animationComplete, audioInitialized, showMainMenu, handleLoadingComplete]);
//
//  useEffect(() => {
//    if (DEBUG) {
//      console.log('[APP DEBUG] State:', {
//        hasUserInteracted,
//        modelsLoaded,
//        animationComplete,
//        audioInitialized,
//        showMainMenu,
//        showKeyboard,
//        loadingProgress
//      });
//    }
//  }, [hasUserInteracted, modelsLoaded, animationComplete, audioInitialized, showMainMenu, showKeyboard, loadingProgress]);
//
//  // Show animated models during the entire loading phase
//  const showAnimatedModels = hasUserInteracted && !showKeyboard;
//
//  useEffect(() => {
//    if (DEBUG) {
//      console.log('[APP] showAnimatedModels condition:', {
//        hasUserInteracted,
//        showKeyboard,
//        showAnimatedModels: hasUserInteracted && !showKeyboard
//      });
//    }
//  }, [hasUserInteracted, showKeyboard]);
//
//  if (!hasUserInteracted) {
//    return (
//      <div className={styles.splashScreen} onClick={handleEnterClick}>
//        {/* Magical floating particles */}
//        <div className={styles.particle}></div>
//        <div className={styles.particle}></div>
//        <div className={styles.particle}></div>
//        <div className={styles.particle}></div>
//        <div className={styles.particle}></div>
//        <div className={styles.particle}></div>
//        <div className={styles.particle}></div>
//        <div className={styles.particle}></div>
//
//        <div className={styles.splashContent}>
//          <h1>Virtual Piano</h1>
//          <p>Click anywhere to start</p>
//        </div>
//      </div>
//    );
//  }
//
//  const isLoading = hasUserInteracted && (!modelsLoaded || !animationComplete);
//
//  return (
//    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
//
//      {preloaderStarted && !modelsLoaded && (
//        <Preloader
//          onLoaded={() => setModelsLoaded(true)}
//          onProgress={setLoadingProgress}
//        />
//      )}
//
//      <Canvas
//        frameloop="demand"
//        dpr={1}
//        gl={{
//          powerPreference: "high-performance",
//          antialias: false,
//          alpha: false,
//          logarithmicDepthBuffer: false,
//          precision: "highp",
//          preserveDrawingBuffer: false,
//          stencil: false,
//        }}
//        onCreated={({ gl }) => {
//          gl.setClearColor('#111144');
//          gl.shadowMap.enabled = false;
//          gl.autoClear = true;
//        }}
//      >
//        <SceneDebugger />
//        <VisibilityController />
//        <Camera />
//
//        <BloomScene>
//          {debug && <Stats />}
//          <ambientLight intensity={0.9} />
//          <pointLight position={[10, 10, 10]} intensity={500} />
//          <pointLight position={[-20, 0, -10]} intensity={60} />
//
//          {showAnimatedModels && (
//            <group position={[-1, 0.4, 1]} rotation={[degreesToRad(25), degreesToRad(-8), degreesToRad(0)]}>
//              <AnimatedObject
//                url="/models/loading/cat_black.glb"
//                position={[3, 1, 1]}
//                rotation={[0, 0, 0]}
//                scale={1.2}
//              />
//              <AnimatedObject
//                url="/models/loading/cat_tuxedo.glb"
//                position={[3.2, 0.9, 0.95]}
//                rotation={[0, 0, 0]}
//                scale={1.2}
//              />
//              <AnimatedObject
//                url="/models/loading/piano.glb"
//                position={[3, 1, 1]}
//                rotation={[degreesToRad(0), 0, 0]}
//                scale={1.0}
//                shouldAnimate={false}
//              />
//              <AnimatedObject
//                url="/models/loading/title.glb"
//                position={[13, 1.4, 1]}
//                rotation={[0, 0, 0]}
//                scale={8}
//                shouldAnimate
//              />
//            </group>
//          )}
//
//          {showKeyboard && modelsLoaded && <PianoKeyboard />}
//        </BloomScene>
//      </Canvas>
//
//      {isLoading && (
//        <LoadingScreen
//          progress={loadingProgress}
//          audioInitialized={audioInitialized}
//          modelsLoaded={modelsLoaded}
//          onComplete={handleLoadingComplete}
//          onAnimationComplete={() => setAnimationComplete(true)}
//        />
//      )}
//
//      {showMainMenu && !showKeyboard && (
//        <MainMenu
//          onSinglePlayer={handleSinglePlayer}
//          isInitializing={false}
//        />
//      ) }
//
//      <button
//        onClick={() => setDebug(!debug)}
//        className={styles.debugButton}
//      >
//        {debug ? 'Hide Stats' : 'Show Stats'}
//      </button>
//    </div>
//  );
//}
//
//function SceneDebugger() {
//  const { scene } = useThree();
//
//  useEffect(() => {
//    if (DEBUG) {
//      console.log('[SCENE DEBUG] Scene children count:', scene.children.length);
//      scene.children.forEach((child, index) => {
//        console.log(`[SCENE DEBUG] Child ${index}:`, child.name, child.type, child.visible);
//      });
//    }
//  });
//
//  return null;
//}
