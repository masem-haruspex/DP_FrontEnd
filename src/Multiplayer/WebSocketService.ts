// Multiplayer/WebSocketService.ts
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

export interface KeyEvent {
  userId: string;
  key: string;
  noteName?: string;
  type: 'KEY_DOWN' | 'KEY_UP';
}

export interface ChatMessage {
  userId: string;
  content: string;
  timestamp: Date;
}

export interface RoomEvent {
  type: string;
  payload: any;
}

export class WebSocketService {
  private stompClient: Stomp.Client | null = null;
  private subscriptions: Map<string, Stomp.Subscription> = new Map();
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  connect(roomCode: string, userId: string, token: string): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const socket = new SockJS('http://localhost:8082/ws');
      this.stompClient = Stomp.over(socket);

      const headers = {
        'X-User-ID': userId,
        'Authorization': `Bearer ${token}`,
        'roomCode': roomCode
      };

      console.log('WebSocket connection attempt:', {
        roomCode,
        userId,
        hasToken: !!token,
        headers
      });

      this.stompClient.connect(headers,
        () => {
          console.log('WebSocket connected successfully to room:', roomCode);
          this.isConnected = true;

          this.subscribeToRoom(roomCode);
          this.subscribeToUser(userId);

          this.stompClient?.send(`/app/rooms/${roomCode}/join`, {}, JSON.stringify({}));

          resolve();
        },
        (error: any) => {
          console.error('WebSocket connection failed:', error);
          this.isConnected = false;
          this.connectionPromise = null;
          reject(error);
        }
      );

      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('WebSocket connection timeout'));
          this.connectionPromise = null;
        }
      }, 10000);
    });

    return this.connectionPromise;
  }

  private subscribeToRoom(roomCode: string) {
    if (!this.stompClient || !this.isConnected) return;

    const keySub = this.stompClient.subscribe(`/topic/rooms/${roomCode}/keyEvents`, (message) => {
      try {
        const event = JSON.parse(message.body);
        this.messageHandlers.get('KEY_EVENT')?.forEach(handler => handler(event));
      } catch (error) {
        console.error('Error parsing key event:', error);
      }
    });
    this.subscriptions.set(`room-${roomCode}-keys`, keySub);

    const chatSub = this.stompClient.subscribe(`/topic/rooms/${roomCode}/chat`, (message) => {
      try {
        const event = JSON.parse(message.body);
        this.messageHandlers.get('CHAT_MESSAGE')?.forEach(handler => handler(event));
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    });
    this.subscriptions.set(`room-${roomCode}-chat`, chatSub);

    const participantSub = this.stompClient.subscribe(`/topic/rooms/${roomCode}/participants`, (message) => {
      try {
        const event = JSON.parse(message.body);
        if (event.type === 'USER_JOINED') {
          this.messageHandlers.get('PLAYER_JOINED')?.forEach(handler => handler(event));
        } else if (event.type === 'USER_LEFT') {
          this.messageHandlers.get('PLAYER_LEFT')?.forEach(handler => handler(event));
        }
      } catch (error) {
        console.error('Error parsing participant event:', error);
      }
    });
    this.subscriptions.set(`room-${roomCode}-participants`, participantSub);
  }

  private subscribeToUser(userId: string) {
    if (!this.stompClient || !this.isConnected) return;

    const sub = this.stompClient.subscribe(`/topic/user/${userId}`, (message) => {
      try {
        const event = JSON.parse(message.body);
        this.messageHandlers.get('USER_EVENT')?.forEach(handler => handler(event));
      } catch (error) {
        console.error('Error parsing user message:', error);
      }
    });
    this.subscriptions.set(`user-${userId}`, sub);
  }

  sendKeyEvent(roomCode: string, event: KeyEvent) {
    if (!this.stompClient || !this.isConnected) {
      console.warn('WebSocket not connected, cannot send key event');
      return;
    }
    this.stompClient.send(`/app/rooms/${roomCode}/keyEvent`, {}, JSON.stringify(event));
  }

  sendChatMessage(roomCode: string, message: ChatMessage) {
    if (!this.stompClient || !this.isConnected) {
      console.warn('WebSocket not connected, cannot send chat message');
      return;
    }
    this.stompClient.send(`/app/rooms/${roomCode}/sendMessage`, {}, JSON.stringify(message));
  }

  on(eventType: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  disconnect() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    this.messageHandlers.clear();
    this.isConnected = false;
    this.connectionPromise = null;

    if (this.stompClient) {
      this.stompClient.disconnect(() => {
        console.log('WebSocket disconnected');
      });
      this.stompClient = null;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
