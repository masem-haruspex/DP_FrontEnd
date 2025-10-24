// Multiplayer/WebSocketService.ts
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const DEBUG = false;

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
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

	private userId: string | null = null;
	private token: string | null = null;
	private currentRoomCode: string | null = null;

	  public connect(roomCode: string, userId: string, token: string): Promise<void> {
    if (this.connectionPromise) {
      if (DEBUG) console.log(`[WebSocketService] Connection promise already exists, returning existing promise`);
      return this.connectionPromise;
    }

    if (DEBUG) console.log(`[WebSocketService] Starting connection to room: ${roomCode}, user: ${userId}`);

    this.userId = userId;
    this.token = token;
    this.currentRoomCode = roomCode;

    this.connectionPromise = new Promise((resolve, reject) => {
      const socket = new SockJS('http://localhost:8083/ws');
      this.stompClient = Stomp.over(socket);
      this.stompClient.debug = DEBUG ? console.log : () => {};

      if (!DEBUG) {
        (socket as any).onmessage = () => {};
        (socket as any).onerror = () => {};
      }

      const headers = {
        'X-User-ID': userId,
        'Authorization': `Bearer ${token}`,
        'roomCode': roomCode
      };

      socket.onclose = (event) => {
        if (DEBUG) console.log(`[WebSocketService] WebSocket closed:`, event);
        this.handleConnectionLost();
      };

      socket.onerror = (error) => {
        if (DEBUG) console.error(`[WebSocketService] WebSocket error:`, error);
        this.handleConnectionError();
      };

      this.stompClient.connect(headers,
        () => {
          if (DEBUG) console.log(`[WebSocketService] WebSocket connected successfully to room: ${roomCode}`);
          this.isConnected = true;
          this.reconnectAttempts = 0; 

          this.subscribeToRoom(roomCode);
          this.subscribeToUser(userId);

          if (DEBUG) console.log(`[WebSocketService] Sending join message to room: ${roomCode}`);

          const joinHeaders = {
            'X-User-ID': this.userId!,
            'Authorization': `Bearer ${this.token}`
          };
          this.stompClient?.send(`/app/rooms/${roomCode}/join`, joinHeaders, JSON.stringify({}));

          this.emitConnectionEvent('CONNECTION_ESTABLISHED', {
            roomCode,
            userId,
            timestamp: Date.now()
          });

          resolve();
        },
        (error: any) => {
          if (DEBUG) console.error(`[WebSocketService] WebSocket connection failed:`, error);
          this.isConnected = false;
          this.connectionPromise = null;

          this.emitConnectionEvent('CONNECTION_FAILED', {
            error: error?.toString(),
            roomCode,
            timestamp: Date.now()
          });

          reject(error);
        }
      );

      setTimeout(() => {
        if (!this.isConnected) {
          if (DEBUG) console.error(`[WebSocketService] WebSocket connection timeout after 10 seconds`);

          this.emitConnectionEvent('CONNECTION_TIMEOUT', {
            roomCode,
            timestamp: Date.now()
          });

          reject(new Error('WebSocket connection timeout'));
          this.connectionPromise = null;
        }
      }, 10000);
    });

    return this.connectionPromise;
  }

	  private handleConnectionLost() {
    if (DEBUG) console.log(`[WebSocketService] Connection lost`);

    this.isConnected = false;

    this.emitConnectionEvent('CONNECTION_LOST', {
      roomCode: this.currentRoomCode,
      userId: this.userId,
      timestamp: Date.now()
    });

    this.attemptReconnection();
  }

  private handleConnectionError() {
    if (DEBUG) console.log(`[WebSocketService] Connection error`);

    this.emitConnectionEvent('CONNECTION_ERROR', {
      roomCode: this.currentRoomCode,
      userId: this.userId,
      timestamp: Date.now()
    });
  }

  private attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (DEBUG) console.log(`[WebSocketService] Max reconnection attempts reached`);

      this.emitConnectionEvent('CONNECTION_PERMANENTLY_LOST', {
        roomCode: this.currentRoomCode,
        userId: this.userId,
        timestamp: Date.now()
      });

      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30 * 1000); 

    if (DEBUG) console.log(`[WebSocketService] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.emitConnectionEvent('RECONNECTING', {
      roomCode: this.currentRoomCode,
      userId: this.userId,
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      nextAttemptIn: delay,
      timestamp: Date.now()
    });

    this.reconnectTimeout = setTimeout(() => {
      if (this.currentRoomCode && this.userId && this.token) {
        this.connect(this.currentRoomCode, this.userId, this.token)
          .then(() => {
            if (DEBUG) console.log(`[WebSocketService] Reconnection successful`);

            this.emitConnectionEvent('RECONNECTED', {
              roomCode: this.currentRoomCode,
              userId: this.userId,
              timestamp: Date.now()
            });
          })
          .catch((error) => {
            if (DEBUG) console.error(`[WebSocketService] Reconnection failed:`, error);

            this.emitConnectionEvent('RECONNECTION_FAILED', {
              roomCode: this.currentRoomCode,
              userId: this.userId,
              attempt: this.reconnectAttempts,
              error: error?.toString(),
              timestamp: Date.now()
            });
          });
      }
    }, delay);
  }

  private emitConnectionEvent(eventType: string, data: any) {
    if (DEBUG) console.log(`[WebSocketService] Emitting connection event: ${eventType}`, data);

    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }

    const connectionHandlers = this.messageHandlers.get('CONNECTION_EVENT');
    if (connectionHandlers) {
      connectionHandlers.forEach(handler => handler({ type: eventType, ...data }));
    }
  }

  public getConnectionStatus(): { isConnected: boolean; roomCode: string | null; userId: string | null } {
    return {
      isConnected: this.isConnected,
      roomCode: this.currentRoomCode,
      userId: this.userId
    };
  }

  public async reconnect(): Promise<void> {
    if (DEBUG) console.log(`[WebSocketService] Manual reconnection requested`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts = 0;

    if (this.currentRoomCode && this.userId && this.token) {
      return this.connect(this.currentRoomCode, this.userId, this.token);
    } else {
      throw new Error('Cannot reconnect: missing connection parameters');
    }
  }


	private subscribeToRoom(roomCode: string): void {
		if (!this.stompClient || !this.isConnected) {
			if (DEBUG) console.warn(`[WebSocketService] Cannot subscribe to room ${roomCode} - not connected`);
			return;
		}

		if (DEBUG) console.log(`[WebSocketService] Subscribing to room channels for room: ${roomCode}`);

		const keySub = this.stompClient.subscribe(`/topic/rooms/${roomCode}/keyEvents`, (message) => {
			if (DEBUG) console.log(`[WebSocketService] Received key event for room ${roomCode}:`, message.body);
			try {
				const event = JSON.parse(message.body);
				const handlers = this.messageHandlers.get('KEY_EVENT');
				if (DEBUG) console.log(`[WebSocketService] Processing KEY_EVENT with ${handlers?.length || 0} handlers`);
				handlers?.forEach(handler => handler(event));
			} catch (error) {
				console.error(`[WebSocketService] Error parsing key event:`, error);
			}
		});
		this.subscriptions.set(`room-${roomCode}-keys`, keySub);

		const chatSub = this.stompClient.subscribe(`/topic/rooms/${roomCode}/chat`, (message) => {
			if (DEBUG) console.log(`[WebSocketService] Received chat message for room ${roomCode}:`, message.body);
			try {
				const event = JSON.parse(message.body);
				const handlers = this.messageHandlers.get('CHAT_MESSAGE');
				if (DEBUG) console.log(`[WebSocketService] Processing CHAT_MESSAGE with ${handlers?.length || 0} handlers`);
				handlers?.forEach(handler => handler(event));
			} catch (error) {
				console.error(`[WebSocketService] Error parsing chat message:`, error);
			}
		});
		this.subscriptions.set(`room-${roomCode}-chat`, chatSub);

		const participantSub = this.stompClient.subscribe(`/topic/rooms/${roomCode}/participants`, (message) => {
			if (DEBUG) console.log(`[WebSocketService] RAW participant event:`, message.body);
			try {
				const event = JSON.parse(message.body);
				if (DEBUG) console.log(`[WebSocketService] Participant event parsed:`, event);
				if (event.type === 'USER_JOINED') {
					if (DEBUG) console.log(`[WebSocketService] USER_JOINED event:`, event);
					const handlers = this.messageHandlers.get('PLAYER_JOINED');
					handlers?.forEach(handler => handler(event));
				} else if (event.type === 'USER_LEFT') {
					if (DEBUG) console.log(`[WebSocketService] USER_LEFT event:`, event);
					const handlers = this.messageHandlers.get('PLAYER_LEFT');
					handlers?.forEach(handler => handler(event));
				}
			} catch (error) {
				console.error(`[WebSocketService] Error parsing participant event:`, error);
			}
		});
		this.subscriptions.set(`room-${roomCode}-participants`, participantSub);

		if (DEBUG) console.log(`[WebSocketService] Successfully subscribed to ${this.subscriptions.size} channels for room ${roomCode}`);
	}

	private subscribeToUser(userId: string): void {
		if (!this.stompClient || !this.isConnected) {
			if (DEBUG) console.warn(`[WebSocketService] Cannot subscribe to user ${userId} - not connected`);
			return;
		}

		if (DEBUG) console.log(`[WebSocketService] Subscribing to user channel: ${userId}`);

		const sub = this.stompClient.subscribe(`/topic/user/${userId}`, (message) => {
			if (DEBUG) console.log(`[WebSocketService] Received user event for ${userId}:`, message.body);
			try {
				const event = JSON.parse(message.body);
				const handlers = this.messageHandlers.get('USER_EVENT');
				if (DEBUG) console.log(`[WebSocketService] Processing USER_EVENT with ${handlers?.length || 0} handlers`);
				handlers?.forEach(handler => handler(event));
			} catch (error) {
				console.error(`[WebSocketService] Error parsing user message:`, error);
			}
		});
		this.subscriptions.set(`user-${userId}`, sub);

		if (DEBUG) console.log(`[WebSocketService] Successfully subscribed to user channel: ${userId}`);
	}

	public sendKeyEvent(roomCode: string, event: KeyEvent): void {
		if (!this.stompClient || !this.isConnected) {
			if (DEBUG) console.warn(`[WebSocketService] WebSocket not connected, cannot send key event to room ${roomCode}`);
			return;
		}

		if (DEBUG) console.log(`[WebSocketService] Sending key event to room ${roomCode}:`, event);

		const headers = {
			'X-User-ID': this.userId!,
			'Authorization': `Bearer ${this.token}`
		};

		this.stompClient.send(
			`/app/rooms/${roomCode}/keyEvent`,
			headers,
			JSON.stringify(event)
		);
	}

	public sendChatMessage(roomCode: string, message: ChatMessage): void {
		if (!this.stompClient || !this.isConnected) {
			if (DEBUG) console.warn(`[WebSocketService] WebSocket not connected, cannot send chat message to room ${roomCode}`);
			return;
		}

		if (DEBUG) console.log(`[WebSocketService] Sending chat message to room ${roomCode}:`, message);

		const headers = {
			'X-User-ID': this.userId!,
			'Authorization': `Bearer ${this.token}`
		};

		this.stompClient.send(
			`/app/rooms/${roomCode}/sendMessage`,
			headers,
			JSON.stringify(message)
		);
	}

	public on(eventType: string, handler: (data: any) => void): void {
		if (DEBUG) console.log(`[WebSocketService] Adding handler for event type: ${eventType}`);

		if (!this.messageHandlers.has(eventType)) {
			this.messageHandlers.set(eventType, []);
		}
		this.messageHandlers.get(eventType)!.push(handler);

		if (DEBUG) console.log(`[WebSocketService] Total handlers for ${eventType}: ${this.messageHandlers.get(eventType)!.length}`);
	}

	public off(eventType: string, handler: (data: any) => void): void {
		if (DEBUG) console.log(`[WebSocketService] Removing handler for event type: ${eventType}`);

		const handlers = this.messageHandlers.get(eventType);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
				if (DEBUG) console.log(`[WebSocketService] Handler removed. Remaining handlers for ${eventType}: ${handlers.length}`);
			} else {
				if (DEBUG) console.warn(`[WebSocketService] Handler not found for event type: ${eventType}`);
			}
		} else {
			if (DEBUG) console.warn(`[WebSocketService] No handlers found for event type: ${eventType}`);
		}
	}

	public disconnect(): void {
		if (DEBUG) console.log(`[WebSocketService] Disconnecting WebSocket. Active subscriptions: ${this.subscriptions.size}, Active handlers: ${this.messageHandlers.size}`);

		    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts = 0;

    this.emitConnectionEvent('DISCONNECTED', {
      roomCode: this.currentRoomCode,
      userId: this.userId,
      timestamp: Date.now()
    });

		this.subscriptions.forEach((sub, key) => {
			if (DEBUG) console.log(`[WebSocketService] Unsubscribing from: ${key}`);
			sub.unsubscribe();
		});
		this.subscriptions.clear();

		this.messageHandlers.clear();
		this.isConnected = false;
		this.connectionPromise = null;

		this.userId = null;
		this.token = null;
		this.currentRoomCode = null;

		if (this.stompClient) {
			if (DEBUG) console.log(`[WebSocketService] Disconnecting STOMP client`);
			this.stompClient.disconnect(() => {
				if (DEBUG) console.log(`[WebSocketService] WebSocket disconnected successfully`);
			});
			this.stompClient = null;
		} else {
			if (DEBUG) console.log(`[WebSocketService] No STOMP client to disconnect`);
		}
	}

	//public getConnectionStatus(): boolean {
	//	if (DEBUG) console.log(`[WebSocketService] Connection status: ${this.isConnected}`);
	//	return this.isConnected;
	//}

	public getSubscriptionCount(): number {
		if (DEBUG) console.log(`[WebSocketService] Subscription count: ${this.subscriptions.size}`);
		return this.subscriptions.size;
	}

	public getHandlerCount(eventType?: string): number {
		if (eventType) {
			const count = this.messageHandlers.get(eventType)?.length || 0;
			if (DEBUG) console.log(`[WebSocketService] Handler count for ${eventType}: ${count}`);
			return count;
		} else {
			let total = 0;
			this.messageHandlers.forEach(handlers => total += handlers.length);
			if (DEBUG) console.log(`[WebSocketService] Total handler count: ${total}`);
			return total;
		}
	}
}
