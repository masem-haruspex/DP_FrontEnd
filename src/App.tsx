// App.tsx
import { Stats } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import Camera from './Camera/Camera';
import { BloomScene } from "./Keyboard/MusicNote";
import Preloader from './Preloader/Preloader';
import Keyboard from './Keyboard/Keyboard';
import MainMenu from './Menu/MainMenu';
import SplashScreen from './LoadingScreen/SplashScreen';
import { degreesToRad } from './lib/pianoHelpers';
import AnimatedObject from './LoadingScreen/AnimatedObject';
import styles from './App.module.scss';
import SinglePlayer from './SinglePlayer/SinglePlayer';
import { useAuth } from './Auth/AuthContext';
import { WebSocketService } from './Multiplayer/WebSocketService';
import Multiplayer from './Multiplayer/Multiplayer';
import { menuStateAtom, cameraRotationAtom, cameraPositionAtom, markIntroAnimationsPlayedAtom } from './atoms/menuState';
import { initializeAudioAtom, isAudioReadyAtom } from './atoms/audio';
import { singlePlayerAudioSettingsAtom, multiplayerAudioSettingsAtom } from './atoms/audio';
import { RoomService } from './Multiplayer/RoomService';
import { toastsAtom } from './atoms/toast';
import { getOrCreateGuestId } from './lib/cookies';
import { antiAliasingAtom, reducedMotionAtom } from './atoms/settings';
import { preferredKeyboardAtom } from './atoms/auth';

export default function App() {
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showSinglePlayer, setShowSinglePlayer] = useState(false);
  const [preloaderStarted, setPreloaderStarted] = useState(false);
  const [debug, setDebug] = useState(false);
  const [startLoadingAnimations, setStartLoadingAnimations] = useState(false);
  const [currentMultiplayerRoom, setCurrentMultiplayerRoom] = useState<string | null>(null);
  const [webSocketService, setWebSocketService] = useState<WebSocketService | null>(null);
  const [_, setAnimationsComplete] = useState(false);
  const [minDelayPassed, setMinDelayPassed] = useState(false);

  const isAudioReady = useAtomValue(isAudioReadyAtom);
  const initializeAudio = useSetAtom(initializeAudioAtom);
  const [multiplayerPlayers, setMultiplayerPlayers] = useState<any[]>([]);
  const { user } = useAuth();
  const [menuState] = useAtom(menuStateAtom);
  const [cameraRotation] = useAtom(cameraRotationAtom);
  const [cameraPosition] = useAtom(cameraPositionAtom);
  const [, markIntroAnimationsPlayed] = useAtom(markIntroAnimationsPlayedAtom);
  const [singlePlayerSettings, setSinglePlayerSettings] = useAtom(singlePlayerAudioSettingsAtom);
  const [multiplayerSettings, setMultiplayerSettings] = useAtom(multiplayerAudioSettingsAtom);
  const setToasts = useSetAtom(toastsAtom);
  const antiAliasing = useAtomValue(antiAliasingAtom);
  const reducedMotion = useAtomValue(reducedMotionAtom);
  const preferredKeyboard = useAtomValue(preferredKeyboardAtom);

  const handleEnterClick = async () => {
    setHasUserInteracted(true);
    setStartLoadingAnimations(true);
    initializeAudio().catch(error => console.error('Audio initialization failed:', error));
  };

  const handleLoadingComplete = useCallback(() => {
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

    const userId = user?.id || getOrCreateGuestId();
    const token = localStorage.getItem('token');
    const wsService = new WebSocketService();

    try {
      const participants = await RoomService.getRoomParticipants(roomCode);

      const playerObjects = participants.map((participant, index) => {
        const totalPlayers = participants.length;
        const angle = (index / Math.max(totalPlayers, 2)) * Math.PI * 2;
        const radius = 20;

        return {
          id: participant.userId,
          username: participant.username || `User ${(participant.userId).slice(0, 8)}`,
          position: [
            Math.cos(angle) * radius,
            -8,
            Math.sin(angle) * radius
          ] as [number, number, number],
          preferredKeyboard: participant.preferredKeyboard || 'Casio'
        };
      });

      setMultiplayerPlayers(playerObjects);

      await wsService.connect(roomCode, userId, token);
      setWebSocketService(wsService);

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);

      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Failed to connect to room',
        submessage: 'Please check your connection and try again',
        type: 'error',
        duration: 5000,
      }]);

      setShowMainMenu(true);
      setCurrentMultiplayerRoom(null);
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

  useEffect(() => {
    if (!menuState.introAnimationsPlayed) {
      markIntroAnimationsPlayed();
    }
  }, [menuState.introAnimationsPlayed, markIntroAnimationsPlayed]);

  useEffect(() => {
    return () => {
      if (webSocketService) {
        webSocketService.disconnect();
      }
    };
  }, [webSocketService]);

  useEffect(() => {
    if (!webSocketService || !currentMultiplayerRoom) return;

    const handleConnectionLost = (data: any) => {
      console.log('WebSocket connection lost:', data);
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Connection lost',
        submessage: 'Attempting to reconnect...',
        type: 'warning',
        duration: 5000,
      }]);
    };

    const handleReconnecting = (data: any) => {
      console.log('WebSocket reconnecting:', data);
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Reconnecting...',
        submessage: `Attempt ${data.attempt} of ${data.maxAttempts}`,
        type: 'info',
        duration: 3000,
      }]);
    };

    const handleReconnected = (data: any) => {
      console.log('WebSocket reconnected:', data);
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Connection restored!',
        type: 'success',
        duration: 3000,
      }]);
    };

    const handleConnectionPermanentlyLost = (data: any) => {
      console.log('WebSocket connection permanently lost:', data);
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Connection lost',
        submessage: 'Failed to reconnect after multiple attempts',
        type: 'error',
        duration: 0,
      }]);
    };

    const handleConnectionEstablished = (data: any) => {
      console.log('WebSocket connection established:', data);
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Connected to room!',
        submessage: 'Real-time features are now active',
        type: 'success',
        duration: 3000,
      }]);
    };

    webSocketService.on('CONNECTION_LOST', handleConnectionLost);
    webSocketService.on('RECONNECTING', handleReconnecting);
    webSocketService.on('RECONNECTED', handleReconnected);
    webSocketService.on('CONNECTION_PERMANENTLY_LOST', handleConnectionPermanentlyLost);
    webSocketService.on('CONNECTION_ESTABLISHED', handleConnectionEstablished);

    return () => {
      webSocketService.off('CONNECTION_LOST', handleConnectionLost);
      webSocketService.off('RECONNECTING', handleReconnecting);
      webSocketService.off('RECONNECTED', handleReconnected);
      webSocketService.off('CONNECTION_PERMANENTLY_LOST', handleConnectionPermanentlyLost);
      webSocketService.off('CONNECTION_ESTABLISHED', handleConnectionEstablished);
    };
  }, [webSocketService]);

  useEffect(() => {
    if (!webSocketService || !currentMultiplayerRoom) return;

    const myId = user?.id || getOrCreateGuestId();

    const prettyName = (raw: any): string => {
      if (raw.username && typeof raw.username === 'string') return raw.username;
      const id = raw.userId || raw.id;
      if (id) return `guest-${id.slice(0, 8)}`;
      return 'Someone';
    };

    const handlePlayerJoined = (payload: any) => {
      const id = payload.userId || payload.id;
      if (!id) return;

      const name = prettyName(payload);

      if (id !== myId) {
        setToasts(prev => [...prev, {
          id: Date.now().toString(),
          message: `${name} joined the room`,
          type: 'info',
          duration: 3000,
        }]);
      }

      setMultiplayerPlayers(prev => {
        if (prev.some(p => p.id === id)) return prev;

        const count = prev.length + 1;
        const angle = (count / Math.max(count, 2)) * Math.PI * 2;
        const radius = 20;

        return [...prev, {
          id,
          username: name,
          position: [
            Math.cos(angle) * radius,
            -8,
            Math.sin(angle) * radius,
          ] as [number, number, number],
          preferredKeyboard: payload.preferredKeyboard || 'Casio',
        }];
      });
    };

    const handlePlayerLeft = (payload: any) => {
      const id = payload.userId || payload.id;
      if (!id) return;

      const name = prettyName(payload);

      if (id !== myId) {
        setToasts(prev => [...prev, {
          id: Date.now().toString(),
          message: `${name} left the room`,
          type: 'info',
          duration: 3000,
        }]);
      }

      setMultiplayerPlayers(prev => prev.filter(p => p.id !== id));
    };

    webSocketService.on('PLAYER_JOINED', handlePlayerJoined);
    webSocketService.on('PLAYER_LEFT', handlePlayerLeft);

    return () => {
      webSocketService.off('PLAYER_JOINED', handlePlayerJoined);
      webSocketService.off('PLAYER_LEFT', handlePlayerLeft);
    };
  }, [webSocketService, currentMultiplayerRoom, user]);

  useEffect(() => {
    if (!preloaderStarted) {
      setPreloaderStarted(true);
    }
  }, []);

  useEffect(() => {
    if (modelsLoaded && isAudioReady && minDelayPassed && !showMainMenu && !showSinglePlayer && !currentMultiplayerRoom) {
      handleLoadingComplete();
    }
  }, [modelsLoaded, isAudioReady, minDelayPassed, showMainMenu, showSinglePlayer, currentMultiplayerRoom, handleLoadingComplete]);

  useEffect(() => {
    if (hasUserInteracted && !minDelayPassed) {
      const timer = setTimeout(() => {
        setMinDelayPassed(true);
      }, 5 * 1000);

      return () => clearTimeout(timer);
    }
  }, [hasUserInteracted, minDelayPassed]);

  useEffect(() => {
    const handleCsrfError = (event: CustomEvent) => {
      console.error(event.detail);
      setToasts(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Security session expired',
        submessage: 'Please try your action again',
        type: 'error',
        duration: 5000,
      }]);
    };

    window.addEventListener('csrf-error', handleCsrfError as EventListener);

    return () => {
      window.removeEventListener('csrf-error', handleCsrfError as EventListener);
    };
  }, [setToasts]);

  useEffect(() => {
    const handleToastEvent = (event: CustomEvent) => {
      setToasts(prev => [...prev, event.detail]);
    };

    window.addEventListener('show-toast', handleToastEvent as EventListener);

    return () => {
      window.removeEventListener('show-toast', handleToastEvent as EventListener);
    };
  }, [setToasts]);

  const getAntialiasValue = () => {
    switch (antiAliasing) {
      case 'off': return false;
      case '2x': return 2;
      case '4x': return 4;
      case '8x': return 8;
      default: return 4;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      <Preloader
        onLoaded={() => setModelsLoaded(true)}
      />
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
            backgroundImage: 'url("/bg-nebula.PNG")',
              backgroundPosition: reducedMotion
                ? 'center' 
                : (menuState.showSinglePlayerMenu || menuState.showMultiplayerMenu || menuState.showSettingsMenu ? 'right' : 'left')
          }}
        />

        {!hasUserInteracted && (
          <SplashScreen onEnterClick={handleEnterClick} />
        )}

        <Canvas
          camera={{ position: [0, 0, 1] }}
          frameloop="demand"
          dpr={1}
          gl={{
            powerPreference: "high-performance",
              antialias: getAntialiasValue() !== false,
              alpha: true,
              logarithmicDepthBuffer: false,
              precision: "highp",
              preserveDrawingBuffer: false,
              stencil: false,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#000000', 0);
            gl.shadowMap.enabled = false;
            gl.autoClear = true;
          }}
        >
          <VisibilityController />
          <BackgroundPan />
          <Camera
            rotation={cameraRotation}
            position={cameraPosition}
          />

          <BloomScene>
            {debug && <Stats />}
            <ambientLight intensity={0.9} />
            <pointLight position={[10, 10, 10]} intensity={500} />
            <pointLight position={[-20, 0, -10]} intensity={60} />

            {showSinglePlayer && modelsLoaded && (
              <Keyboard
                userId={user?.id || 'local'}
                scale={1.0}
                position={[0, -8, -16]}
                isLocalPlayer={true}
                effectSettings={singlePlayerSettings}
                preferredKeyboard={preferredKeyboard}
              />
            )}

            {currentMultiplayerRoom && modelsLoaded && multiplayerPlayers.map((player, index) => {
              const totalPlayers = multiplayerPlayers.length;

              const currentUserId = user?.id || getOrCreateGuestId();
              const currentPlayerIndex = multiplayerPlayers.findIndex(p => p.id === currentUserId);

              let playerPosition: [number, number, number] = [0, 0, 0];
              let rotationY = 0;

              if (totalPlayers === 1) {
                playerPosition = [0, -6, -10];
                rotationY = 0;
              } else if (totalPlayers === 2) {
                if (player.id === currentUserId) {
                  playerPosition = [0, -6, -10];
                } else {
                  playerPosition = [25, -6, -11];
                  rotationY = degreesToRad(32);
                }
              } else if (totalPlayers === 3) {
                if (player.id === currentUserId) {
                  playerPosition = [0, -8, -16];
                  rotationY = 0;
                } else {
                  const isLeftPlayer = index < currentPlayerIndex;
                  if (isLeftPlayer) {
                    playerPosition = [-10, -8, -14];
                    rotationY = degreesToRad(25);
                  } else {
                    playerPosition = [10, -8, -14];
                    rotationY = degreesToRad(-25);
                  }
                }
              }

              return (
                <group key={player.id} position={playerPosition} rotation={[0, rotationY, 0]}>
                  <Keyboard
                    userId={player.id}
                    scale={totalPlayers === 1 ? 1.0 : 1.0}
                    position={playerPosition}
                    isLocalPlayer={player.id === currentUserId}
                    effectSettings={multiplayerSettings}
                    webSocketService={webSocketService}
                    roomCode={currentMultiplayerRoom}
                    preferredKeyboard={player.preferredKeyboard}
                  />
                </group>
              );
            })}

            {!showSinglePlayer && !currentMultiplayerRoom &&
              <group position={[-1, 0.0, -3]} rotation={[degreesToRad(0), degreesToRad(10), degreesToRad(0)]}>
                {(menuState.selectedCat === 'both' || menuState.selectedCat === 'black') && (
                  <AnimatedObject
                    url="/models/loading/cat_black.glb"
                    position={[-0.6, -0.58, 2]}
                    rotation={[0, 0, 0]}
                    scale={[-1.2, 1.2, 1.2]}
                    introAnimationName={"black_cat_duo_piano_loading"}
                    loopAnimationName="black_playing"
                    shouldLoop={true}
                    startAnimation={startLoadingAnimations}
                  />
                )}

                {(menuState.selectedCat === 'both' || menuState.selectedCat === 'tuxedo') && (
                  <AnimatedObject
                    url="/models/loading/cat_tuxedo.glb"
                    position={[-0.6, -0.58, 2]}
                    rotation={[0, 0, 0]}
                    scale={[-1.2, 1.2, 1.2]}
                    introAnimationName={"tuxedo_cat_duo_piano_loading"}
                    loopAnimationName="tuxedo_playing"
                    shouldLoop={true}
                    startAnimation={startLoadingAnimations}
                  />
                )}

                <AnimatedObject
                  url="/models/loading/mouse_l.glb"
                  position={[-0.6, -0.58, 1.87]}
                  rotation={[0, 0, 0]}
                  scale={[-1.0, 1.0, 1.0]}
                  introAnimationName={"MouseLIntro"}
                  loopAnimationName="MouseL"
                  shouldLoop={true}
                  startAnimation={startLoadingAnimations}
                />

                <AnimatedObject
                  url="/models/loading/mouse_r.glb"
                  position={[-0.6, -0.58, 1.87]}
                  rotation={[0, 0, 0]}
                  scale={[-1.0, 1.0, 1.0]}
                  introAnimationName={"MouseRIntro"}
                  loopAnimationName="MouseR"
                  shouldLoop={true}
                  startAnimation={startLoadingAnimations}
                />

                <AnimatedObject
                  url="/models/loading/piano.glb"
                  position={[-0.6, -0.6, 2]}
                  rotation={[0, 0, 0]}
                  scale={[1.2, 1.2, 1.2]}
                  shouldAnimate={false}
                  startAnimation={startLoadingAnimations}
                />

                <group rotation={[0, degreesToRad(-6), 0]}>
                  <AnimatedObject
                    url="/models/loading/title.glb"
                    position={[0, -0.6, 2]}
                    rotation={[0, 0, 0]}
                    scale={[1.2, 1.2, 1.2]}
                    shouldAnimate={true}
                    introAnimationName="title-DP"
                    startAnimation={startLoadingAnimations}
                    onIntroComplete={() => setAnimationsComplete(true)}
                  />
                  <AnimatedObject
                    url="/models/loading/title1.glb"
                    position={[0, -0.6, 2]}
                    rotation={[0, 0, 0]}
                    scale={[1.2, 1.2, 1.2]}
                    shouldAnimate={true}
                    introAnimationName="title-DP.001"
                    startAnimation={startLoadingAnimations}
                    onIntroComplete={() => setAnimationsComplete(true)}
                  />
                  <AnimatedObject
                    url="/models/loading/title2.glb"
                    position={[0, -0.6, 2]}
                    rotation={[0, 0, 0]}
                    scale={[1.2, 1.2, 1.2]}
                    shouldAnimate={true}
                    introAnimationName="title-DP.002"
                    startAnimation={startLoadingAnimations}
                    onIntroComplete={() => setAnimationsComplete(true)}
                  />
                  <AnimatedObject
                    url="/models/loading/title3.glb"
                    position={[0, -0.6, 2]}
                    rotation={[0, 0, 0]}
                    scale={[1.2, 1.2, 1.2]}
                    shouldAnimate={true}
                    introAnimationName="title-DP.003"
                    startAnimation={startLoadingAnimations}
                    onIntroComplete={() => setAnimationsComplete(true)}
                  />
                  <AnimatedObject
                    url="/models/loading/title4.glb"
                    position={[0, -0.6, 2]}
                    rotation={[0, 0, 0]}
                    scale={[1.2, 1.2, 1.2]}
                    shouldAnimate={true}
                    introAnimationName="title-DP.004"
                    startAnimation={startLoadingAnimations}
                    onIntroComplete={() => setAnimationsComplete(true)}
                  />
                </group>
              </group>
            }
          </BloomScene>
        </Canvas>
      </div>

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
        />
      )}

      {currentMultiplayerRoom && webSocketService && (
        <Multiplayer
          roomCode={currentMultiplayerRoom}
          onLeave={handleLeaveMultiplayer}
          webSocketService={webSocketService}
          onSettingsChange={setMultiplayerSettings}
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

function BackgroundPan() {
  const { scene } = useThree();
  const [menuState] = useAtom(menuStateAtom);

  useEffect(() => {
    const background = scene.children.find(child => child.renderOrder === -1);
    if (background) {
      const targetX = (menuState.showSinglePlayerMenu || menuState.showMultiplayerMenu || menuState.showSettingsMenu) ? -1 : 0;
      background.position.x = targetX;
    }
  }, [menuState.showSinglePlayerMenu, menuState.showMultiplayerMenu, menuState.showSettingsMenu, scene]);

  return null;
}

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
