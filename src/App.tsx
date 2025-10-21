// App.tsx
import { Stats } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import Camera from './Camera/Camera';
import { BloomScene } from "./Keyboard/MusicNote";
import Preloader from './Preloader/Preloader';
import Keyboard from './Keyboard/Keyboard';
import MainMenu from './Menu/MainMenu';
import { degreesToRad } from './lib/pianoHelpers';
import AnimatedObject from './LoadingScreen/AnimatedObject';
import styles from './App.module.scss';
import SinglePlayer from './SinglePlayer/SinglePlayer';
import { useAuth } from './Auth/AuthContext';
import { WebSocketService } from './Multiplayer/WebSocketService';
import Multiplayer from './Multiplayer/Multiplayer';
import { menuStateAtom, cameraRotationAtom, cameraPositionAtom, markIntroAnimationsPlayedAtom } from './atoms/menuState';
import { initializeAudioAtom, isAudioReadyAtom } from './atoms/audio';
import { useAtomValue, useSetAtom } from 'jotai';
import { toastsAtom } from './atoms/toast';
import { authAtom, preferredKeyboardAtom } from './atoms/auth';
import axiosInstance from './lib/axiosInstance';
import { setCookie } from './lib/cookies';
import { useQueryClient } from '@tanstack/react-query';
import { singlePlayerAudioSettingsAtom, multiplayerAudioSettingsAtom } from './atoms/audio';
import { RoomService } from './Multiplayer/RoomService';

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
  const queryClient = useQueryClient();
  const rememberMe = false;

  const isAudioReady = useAtomValue(isAudioReadyAtom);
  const initializeAudio = useSetAtom(initializeAudioAtom);
  const [multiplayerPlayers, setMultiplayerPlayers] = useState<any[]>([]);
  const { user } = useAuth();
  const [menuState] = useAtom(menuStateAtom);
  const [cameraRotation] = useAtom(cameraRotationAtom);
  const [cameraPosition] = useAtom(cameraPositionAtom);
  const [, markIntroAnimationsPlayed] = useAtom(markIntroAnimationsPlayedAtom);
  const setAuth = useSetAtom(authAtom);
  const setPreferredKeyboard = useSetAtom(preferredKeyboardAtom);
  const setToasts = useSetAtom(toastsAtom);
  const [singlePlayerSettings, setSinglePlayerSettings] = useAtom(singlePlayerAudioSettingsAtom);
  const [multiplayerSettings, setMultiplayerSettings] = useAtom(multiplayerAudioSettingsAtom);

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

    if (user) {
      const token = localStorage.getItem('token');
      const wsService = new WebSocketService();

      try {
        const participants = await RoomService.getRoomParticipants(roomCode);

        const playerObjects = participants.map((participant, index) => {
          console.log('room participant:', JSON.stringify(participant, null, 2));
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

        await wsService.connect(roomCode, user.id, token || '');
        setWebSocketService(wsService);

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
    if (!menuState.introAnimationsPlayed) {
      markIntroAnimationsPlayed();
    }
  }, [menuState.introAnimationsPlayed, markIntroAnimationsPlayed]);

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
        const playerId = playerData.userId || playerData.id;

        if (!playerId) {
          console.error('[App] No player ID found in join event:', playerData);
          return prev;
        }

        if (prev.some(p => p.id === playerId)) {
          return prev;
        }

        const newPlayerCount = prev.length + 1;
        const angle = (newPlayerCount / Math.max(newPlayerCount, 2)) * Math.PI * 2;
        const radius = 20;

        const position: [number, number, number] = [
          Math.cos(angle) * radius,
          -8,
          Math.sin(angle) * radius
        ];

        const newPlayer = {
          id: playerId, 
          username: playerData.username || `User ${playerId.slice(0, 8)}`,
          position,
          preferredKeyboard: playerData.preferredKeyboard || 'Casio'
        };

        return [...prev, newPlayer];
      });
    };

    const handlePlayerLeft = (eventData: any) => {
  const playerId = eventData.userId || eventData.payload?.userId;

  if (!playerId) {
    console.error('[App] No player ID found in leave event:', eventData);
    return;
  }

  console.log(`[App] Removing player: ${playerId}`);
  setMultiplayerPlayers(prev => {
    const newPlayers = prev.filter(p => p.id !== playerId);
    console.log(`[App] Players after removal: ${newPlayers.length}`);
    return newPlayers;
  });
};


    webSocketService.on('PLAYER_JOINED', handlePlayerJoined);
    webSocketService.on('PLAYER_LEFT', handlePlayerLeft);

    return () => {
      webSocketService.off('PLAYER_JOINED', handlePlayerJoined);
      webSocketService.off('PLAYER_LEFT', handlePlayerLeft);
    };
  }, [webSocketService, currentMultiplayerRoom]);

  useEffect(() => {
    if (!preloaderStarted) {
      setPreloaderStarted(true);
    }
  }, []);

  useEffect(() => {
    if (modelsLoaded && isAudioReady && !showMainMenu && !showSinglePlayer && !currentMultiplayerRoom)
      handleLoadingComplete();
  }, [modelsLoaded, isAudioReady, showMainMenu, showSinglePlayer, currentMultiplayerRoom, handleLoadingComplete]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      {!hasUserInteracted && (
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
      )}

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
              backgroundPosition: menuState.showSinglePlayerModal || menuState.showMultiplayerModal ? 'right' : 'left'
          }}
        />

        <Canvas
          frameloop="demand"
          dpr={1}
          gl={{
            powerPreference: "high-performance",
              antialias: false,
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
          <Camera rotation={cameraRotation} position={cameraPosition} />

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
                preferredKeyboard={user?.preferredKeyboard || 'Casio'}
              />
            )}

            {currentMultiplayerRoom && modelsLoaded && multiplayerPlayers.map((player, index) => {
              const totalPlayers = multiplayerPlayers.length;
              const currentPlayerIndex = multiplayerPlayers.findIndex(p => p.id === user?.id);

              let playerPosition: [number, number, number] = [0, 0, 0];
              let rotationY = 0;

              if (totalPlayers === 1) {
                playerPosition = [0, -6, -10];
                rotationY = 0;
            } else if (totalPlayers === 2) {
              if (player.id === user?.id) {
                playerPosition = [0, -6, -10];
            } else {
                playerPosition = [25, -6, -11];
              rotationY = degreesToRad(32); 
            }
            }
            else if (totalPlayers === 3) {
              if (player.id === user?.id) {
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
                isLocalPlayer={player.id === user?.id}
                effectSettings={multiplayerSettings}
                webSocketService={webSocketService}
                roomCode={currentMultiplayerRoom}
                preferredKeyboard={player.preferredKeyboard}
              />
            </group>
            );
            })}

            {!showSinglePlayer && !currentMultiplayerRoom &&
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
                    startAnimation={startLoadingAnimations}
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
                    startAnimation={startLoadingAnimations}
                  />
                )}

                <AnimatedObject
                  url="/models/loading/piano.glb"
                  position={[3, 1, 1]}
                  rotation={[degreesToRad(0), 0, 0]}
                  scale={1.0}
                  shouldAnimate={false}
                  startAnimation={startLoadingAnimations}
                />

                <AnimatedObject
                  url="/models/loading/title.glb"
                  position={[2, 1.0, 1]}
                  rotation={[0, 0, 0]}
                  scale={1}
                  shouldAnimate={true}
                  introAnimationName="TextAction"
                  startAnimation={startLoadingAnimations}
                />
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
      const targetX = (menuState.showSinglePlayerModal || menuState.showMultiplayerModal) ? -1 : 0;
      background.position.x = targetX;
    }
  }, [menuState.showSinglePlayerModal, menuState.showMultiplayerModal, scene]);

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

