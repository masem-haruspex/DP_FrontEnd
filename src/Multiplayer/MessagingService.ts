// Multiplayer/MessagingService.ts
import api from '../lib/axiosInstance';
import type { Message, SendMessageData } from './Message';
import { getCookie } from '../lib/cookies';

const DEBUG_PREFIX = '[MessagingService]';
const PREFIX = `${import.meta.env.VITE_URL_BACKEND_MESSAGING}`;

const debugLog = (message: string, data?: any) => {
  const DEBUG = false;
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    const logMessage = `${DEBUG_PREFIX} [${timestamp}] ${message}`;
    if (data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
};

export const MessagingService = {
  async sendMessage(userId: string, messageData: SendMessageData): Promise<Message> {
    debugLog('sendMessage: Starting request', { userId, messageData });
    try {
      const headers: any = {
        'X-User-ID': userId
      };

      const token = getCookie('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await api.post<Message>(`${PREFIX}`, messageData, {
        headers,
        withCredentials: true
      });
      debugLog('sendMessage: Success', { messageId: response.data.id });
      return response.data;
    } catch (error) {
      debugLog('sendMessage: Error', error);
      throw error;
    }
  },

  async getRoomMessages(roomCode: string): Promise<Message[]> {
    debugLog('getRoomMessages: Starting request', { roomCode });
    try {
      const response = await api.get<Message[]>(`${PREFIX}/rooms/${roomCode}`, {
        withCredentials: true
      });
      debugLog('getRoomMessages: Success', { messageCount: response.data.length });
      return response.data;
    } catch (error) {
      debugLog('getRoomMessages: Error', error);
      throw error;
    }
  }
};
