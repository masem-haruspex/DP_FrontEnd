// App.tsx
import { Stats } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import Camera from './Camera/Camera';
import { BloomScene } from "./Keyboard/MusicNote";
import LoadingScreen from './LoadingScreen/LoadingScreen';
import Preloader from './Preloader/Preloader';
import Keyboard from './Keyboard/Keyboard';
import MainMenu from './Menu/MainMenu';
import { degreesToRad } from './lib/pianoHelpers';
import AnimatedObject from './LoadingScreen/AnimatedObject';
import styles from './App.module.scss';
import SinglePlayer from './SinglePlayer/SinglePlayer';
import { useAuth } from './Auth/AuthContext';
import { WebSocketService } from './Multiplayer/WebSocketService';
import MultiplayerRoom from './Multiplayer/MultiplayerRoom';
import { menuStateAtom, cameraRotationAtom, cameraPositionAtom, markIntroAnimationsPlayedAtom } from './atoms/menuState';

// State management for OAuth
import { useSetAtom } from 'jotai';
import { toastsAtom } from './atoms/toast';
import { authAtom, preferredKeyboardAtom } from './atoms/auth';
import axiosInstance from './lib/axiosInstance';
import { setCookie } from './lib/cookies';
import { useQueryClient } from '@tanstack/react-query';

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

  // Multiplayer state
  const [currentMultiplayerRoom, setCurrentMultiplayerRoom] = useState<string | null>(null);
  const [webSocketService, setWebSocketService] = useState<WebSocketService | null>(null);

  // Audio settings state
  const [singlePlayerSettings, setSinglePlayerSettings] = useState({
    volume: 0.2,
    reverb: 0.5,
    delay: 0.3,
    distortion: 0.2,
    chorus: 0.4,
    bass: 0,
    mid: 0,
    treble: 0
  });

  const [multiplayerSettings, setMultiplayerSettings] = useState({
    volume: 0.2,
    reverb: 0.5,
    delay: 0.3,
    distortion: 0.2,
    chorus: 0.4,
    bass: 0,
    mid: 0,
    treble: 0
  });

  // Only store actual players from the server
  const [multiplayerPlayers, setMultiplayerPlayers] = useState<any[]>([]);

  const { user } = useAuth();

  const [menuState] = useAtom(menuStateAtom);
  const [cameraRotation] = useAtom(cameraRotationAtom);
  const [cameraPosition] = useAtom(cameraPositionAtom);
  const [, markIntroAnimationsPlayed] = useAtom(markIntroAnimationsPlayedAtom);

  const setAuth = useSetAtom(authAtom);
  const setPreferredKeyboard = useSetAtom(preferredKeyboardAtom);
  const setToasts = useSetAtom(toastsAtom);
  const queryClient = useQueryClient();
  const rememberMe = false;

  const initializeAudio = useCallback(async () => {
    try {
      console.log('Starting audio initialization...');

      // Use the original working import pattern
      const Tone = (await import('tone')) as unknown as typeof import('tone');
      const { Piano } = await import('@tonejs/piano');

      // First ensure audio context is running
      if (Tone.context.state === 'suspended') {
        console.log('Resuming audio context...');
        await Tone.context.resume();
      } else if (Tone.context.state !== 'running') {
        console.log('Starting audio context...');
        await Tone.start();
      }

      console.log('Audio context state:', Tone.context.state);

      // Initialize piano but don't wait for full loading - let it load in background
      const piano = new Piano({
        velocities: 3,
        minNote: 21,
        maxNote: 108
      });

      // Start loading piano but don't block on it
      piano.load().then(() => {
        console.log('Piano loaded successfully');
        piano.dispose();
      }).catch((error) => {
        console.warn('Piano loading failed, but continuing:', error);
      });

      setAudioInitialized(true);
      console.log('Audio initialization completed');

    } catch (error) {
      console.error('Audio initialization failed:', error);
      // Still set audio as initialized to allow app to continue
      setAudioInitialized(true);
    }
  }, []);

  const handleEnterClick = async () => {
    console.log('User clicked to start');
    setHasUserInteracted(true);
    await initializeAudio();
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

  const handleMultiplayerRoom = async (roomCode: string) => {
    setShowMainMenu(false);
    setCurrentMultiplayerRoom(roomCode);

    if (user) {
      const token = localStorage.getItem('token');
      const wsService = new WebSocketService();

      try {
        await wsService.connect(roomCode, user.id, token || '');
        setWebSocketService(wsService);

        setMultiplayerPlayers([{
          id: user.id,
          username: user.username || 'You',
          position: [0, -8, -16] as [number, number, number],
          preferredKeyboard: user.preferredKeyboard || 'Casio'
        }]);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setShowMainMenu(true);
        setCurrentMultiplayerRoom(null);
      }
    }
  };

  const handleLeaveMultiplayer = () => {
    setCurrentMultiplayerRoom(null);
    setMultiplayerPlayers([]);
    if (webSocketService) {
      webSocketService.disconnect();
      setWebSocketService(null);
    }
    setShowMainMenu(true);
  };

  const handleStraightToMenu = () => {
    setHasUserInteracted(true);
    setShowMainMenu(true);
  }

  useEffect(() => {
    if (animationComplete && !menuState.introAnimationsPlayed) {
      markIntroAnimationsPlayed();
    }
  }, [animationComplete, menuState.introAnimationsPlayed, markIntroAnimationsPlayed]);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token = hashParams.get("token");
    const userData = hashParams.get("user");
    const error = hashParams.get("error");

    const handleSuccess = async (token: string, user: any) => {
      const expiresInDays = rememberMe ? 365 : 0;
      setCookie("token", token, expiresInDays);

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      setAuth({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
      });

      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      queryClient.invalidateQueries({ queryKey: ["user"] });

      if (user?.preferredKeyboard) {
        setPreferredKeyboard(user.preferredKeyboard);
      }

      setToasts(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          message: "OAuth login successful!",
          type: "success",
          duration: 3000,
        },
      ]);

      console.log("OAuth login successfully!");
      window.history.replaceState({}, document.title, window.location.pathname);
      handleStraightToMenu();
    };

    const handleError = (msg: string) => {
      console.error("OAuth2 login failed:", msg);
      setToasts(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          message: msg || "OAuth2 login failed",
          type: "error",
          duration: 5000,
        },
      ]);
      handleStraightToMenu();
    };

    if (token) {
      try {
        const user = userData ? JSON.parse(decodeURIComponent(userData)) : null;
        handleSuccess(token, user);
      } catch (err) {
        handleError("Failed to process user data");
      }
    } else if (error) {
      handleError(error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (webSocketService) {
        webSocketService.disconnect();
      }
    };
  }, [webSocketService]);

  useEffect(() => {
    if (!webSocketService || !currentMultiplayerRoom) return;

    const handlePlayerJoined = (playerData: any) => {
      setMultiplayerPlayers(prev => {
        if (prev.some(p => p.id === playerData.id)) return prev;
        return [...prev, playerData];
      });
    };

    const handlePlayerLeft = (playerId: string) => {
      setMultiplayerPlayers(prev => prev.filter(p => p.id !== playerId));
    };

    webSocketService.on('PLAYER_JOINED', handlePlayerJoined);
    webSocketService.on('PLAYER_LEFT', handlePlayerLeft);

    return () => {
      webSocketService.off('PLAYER_JOINED', handlePlayerJoined);
      webSocketService.off('PLAYER_LEFT', handlePlayerLeft);
    };
  }, [webSocketService, currentMultiplayerRoom]);

  useEffect(() => {
    if (hasUserInteracted && !preloaderStarted) {
      setPreloaderStarted(true);
    }
  }, [hasUserInteracted, preloaderStarted]);

  const showAnimatedModels = hasUserInteracted && !showSinglePlayer && !currentMultiplayerRoom;

  const isLoading = hasUserInteracted && (!modelsLoaded || !animationComplete);

  useEffect(() => {
    if (DEBUG) {
      console.log('[APP] Checking completion status:', {
        modelsLoaded,
        animationComplete,
        audioInitialized,
        showMainMenu,
        showSinglePlayer,
        currentMultiplayerRoom,
      });
    }

    if(showMainMenu && !showSinglePlayer && !currentMultiplayerRoom)
      console.log("MAIN MENU DISPLAYED");
    else
      console.log("MAIN MENU NOT");

    if (modelsLoaded && animationComplete && audioInitialized && !showMainMenu && !showSinglePlayer && !currentMultiplayerRoom) {
      if (DEBUG) console.log('[APP] All conditions met, calling handleLoadingComplete');
      handleLoadingComplete();
    }
  }, [modelsLoaded, animationComplete, audioInitialized, showMainMenu, showSinglePlayer, currentMultiplayerRoom, handleLoadingComplete]);

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
      <div
        style={{
          width: '100vw',
            height: '100vh',
            position: 'relative',
            overflow: 'hidden'
        }}
      >
        <div
          className={styles.backgroundImage}
          style={{
            backgroundImage: 'url("/stars.jpg")',
              backgroundPosition: menuState.showSinglePlayerModal || menuState.showMultiplayerModal ? 'right' : 'left'
          }}
        />

        <Canvas
          frameloop="demand"
          dpr={1}
          gl={{
            powerPreference: "high-performance",
              antialias: false,
              alpha: true, // Change to true for transparent background
              logarithmicDepthBuffer: false,
              precision: "highp",
              preserveDrawingBuffer: false,
              stencil: false,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#000000', 0); // Transparent background
            gl.shadowMap.enabled = false;
            gl.autoClear = true;
          }}
        >
          <SceneDebugger />
          <VisibilityController />
          <BackgroundPan />
          <Camera rotation={cameraRotation} position={cameraPosition} />

          <BloomScene>
            {debug && <Stats />}
            <ambientLight intensity={0.9} />
            <pointLight position={[10, 10, 10]} intensity={500} />
            <pointLight position={[-20, 0, -10]} intensity={60} />

            {/* Single Player Keyboard */}
            {showSinglePlayer && modelsLoaded && (
              <Keyboard
                userId={user?.id || 'local'}
                position={[0, -8, -16]}
                isLocalPlayer={true}
                effectSettings={singlePlayerSettings}
                preferredKeyboard={user?.preferredKeyboard || 'Casio'}
              />
            )}

            {currentMultiplayerRoom && modelsLoaded && multiplayerPlayers.map((player) => (
              <Keyboard
                key={player.id}
                userId={player.id}
                position={player.position}
                isLocalPlayer={player.id === user?.id}
                effectSettings={multiplayerSettings}
                webSocketService={webSocketService}
                preferredKeyboard={player.preferredKeyboard}
              />
            ))}

            {showAnimatedModels && (
              <group position={[-1, 0.8, -3]} rotation={[degreesToRad(28), degreesToRad(0), degreesToRad(0)]}>
                {(menuState.selectedCat === 'both' || menuState.selectedCat === 'black') && (
                  <AnimatedObject
                    url="/models/loading/cat_black.glb"
                    position={[3, 1, 1]}
                    rotation={[0, 0, 0]}
                    scale={1.2}
                    introAnimationName={"black_cat_duo_piano_loading"}
                    loopAnimationName="black_playing"
                    shouldLoop={true}
                  />
                )}

                {(menuState.selectedCat === 'both' || menuState.selectedCat === 'tuxedo') && (
                  <AnimatedObject
                    url="/models/loading/cat_tuxedo.glb"
                    position={[3, 1, 1]}
                    rotation={[0, 0, 0]}
                    scale={1.2}
                    introAnimationName={"tuxedo_cat_duo_piano_loading"}
                    loopAnimationName="tuxedo_playing"
                    shouldLoop={true}
                  />
                )}

                <AnimatedObject
                  url="/models/loading/piano.glb"
                  position={[3, 1, 1]}
                  rotation={[degreesToRad(0), 0, 0]}
                  scale={1.0}
                  shouldAnimate={false}
                />

                <AnimatedObject
                  url="/models/loading/title.glb"
                  position={[2, 1.0, 1]}
                  rotation={[0, 0, 0]}
                  scale={1}
                  shouldAnimate={true}
                  introAnimationName="TextAction"
                />
              </group>
            )}


          </BloomScene>
        </Canvas>
      </div>

      {isLoading && (
        <LoadingScreen
          progress={loadingProgress}
          audioInitialized={audioInitialized}
          modelsLoaded={modelsLoaded}
          onComplete={handleLoadingComplete}
          onAnimationComplete={() => setAnimationComplete(true)}
        />
      )}

      {showMainMenu && !showSinglePlayer && !currentMultiplayerRoom && (
        <MainMenu
          onSinglePlayer={handleSinglePlayer}
          onMultiplayerRoom={handleMultiplayerRoom}
          isInitializing={false}
        />
      )}

      {showSinglePlayer && (
        <SinglePlayer
          onBack={handleBackToMenu}
          onSettingsChange={setSinglePlayerSettings}
          currentSettings={singlePlayerSettings}
        />
      )}

      {currentMultiplayerRoom && webSocketService && (
        <MultiplayerRoom
          roomCode={currentMultiplayerRoom}
          onLeave={handleLeaveMultiplayer}
          webSocketService={webSocketService}
          onSettingsChange={setMultiplayerSettings}
          currentSettings={multiplayerSettings}
        />
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

function BackgroundPan() {
  const { scene } = useThree();
  const [menuState] = useAtom(menuStateAtom);

  useEffect(() => {
    const background = scene.children.find(child => child.renderOrder === -1);
    if (background) {
      const targetX = (menuState.showSinglePlayerModal || menuState.showMultiplayerModal) ? -1 : 0;
      background.position.x = targetX;
    }
  }, [menuState.showSinglePlayerModal, menuState.showMultiplayerModal, scene]);

  return null;
}
