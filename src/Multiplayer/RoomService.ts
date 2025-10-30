// Multiplayer/RoomService.ts
import api from '../lib/axiosInstance';
import type { CreateRoomData, Room } from './Room';

const DEBUG_PREFIX = '[RoomService]';
const PREFIX = "http://localhost:8082/api";

const debugLog = (message: string, data?: any) => {
	const DEBUG = true;

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

export const RoomService = {
	async createRoom(ownerId: string, roomData: CreateRoomData): Promise<Room> {
		debugLog('createRoom: Starting request', { ownerId, roomData });
		try {
			const token = localStorage.getItem('token');

			const response = await api.post<Room>(PREFIX + '/rooms', roomData, {
				headers: {
					'X-User-ID': ownerId,
					'Authorization': `Bearer ${token}`
				}
			});
			debugLog('createRoom: Success', { roomId: response.data.id, code: response.data.code });
			return response.data;
		} catch (error) {
			debugLog('createRoom: Error', error);
			throw error;
		}
	},

	async joinRoom(code: string, userId: string, password?: string): Promise<any> {
		debugLog('joinRoom: Starting request', { code, userId, hasPassword: !!password });
		try {
			const headers: any = {
				'X-User-ID': userId
			};

			const token = localStorage.getItem('token');
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await api.post(`${PREFIX}/rooms/${code}/join`,
				{ userId, password },
				{ headers }
			);
			debugLog('joinRoom: Success', { code, userId });
			return response.data;
		} catch (error) {
			debugLog('joinRoom: Error', error);
			throw error;
		}
	},

	//async leaveRoom(code: string, userId: string): Promise<void> {
	//	debugLog('leaveRoom: Starting request', { code, userId });
	//	try {
	//		await api.post(`${PREFIX}/rooms/${code}/leave`, null, {
	//			headers: {
	//				'X-User-ID': userId
	//			}
	//		});
	//		debugLog('leaveRoom: Success', { code, userId });
	//	} catch (error) {
	//		debugLog('leaveRoom: Error', error);
	//		throw error;
	//	}
	//},

	async getRoom(code: string): Promise<Room> {
		debugLog('getRoom: Starting request', { code });
		try {
			const response = await api.get<Room>(`${PREFIX}/rooms/${code}`);
			debugLog('getRoom: Success', { room: response.data });
			return response.data;
		} catch (error) {
			debugLog('getRoom: Error', error);
			throw error;
		}
	},

	async getRoomParticipants(code: string): Promise<any[]> {
		debugLog('getRoomParticipants: Starting request', { code });
		try {
			const response = await api.get<any[]>(`${PREFIX}/rooms/${code}/participants`);
			debugLog('getRoomParticipants: Success', { participantCount: response.data.length });
			return response.data;
		} catch (error) {
			debugLog('getRoomParticipants: Error', error);
			throw error;
		}
	},

	async deleteRoom(roomId: string, ownerId: string): Promise<void> {
		debugLog('deleteRoom: Starting request', { roomId, ownerId });
		try {
			await api.delete(`${PREFIX}/rooms/${roomId}`, {
				headers: {
					'X-User-ID': ownerId
				}
			});
			debugLog('deleteRoom: Success', { roomId });
		} catch (error) {
			debugLog('deleteRoom: Error', error);
			throw error;
		}
	},

	async kickUser(code: string, ownerId: string, userId: string): Promise<void> {
		debugLog('kickUser: Starting request', { code, ownerId, userId });
		try {
			await api.post(`${PREFIX}/rooms/${code}/kick`, { userId }, {
				headers: {
					'X-User-ID': ownerId
				}
			});
			debugLog('kickUser: Success', { code, userId });
		} catch (error) {
			debugLog('kickUser: Error', error);
			throw error;
		}
	},

	async muteUser(code: string, ownerId: string, userId: string): Promise<void> {
		debugLog('muteUser: Starting request', { code, ownerId, userId });
		try {
			await api.post(`${PREFIX}/rooms/${code}/mute`, { userId }, {
				headers: {
					'X-User-ID': ownerId
				}
			});
			debugLog('muteUser: Success', { code, userId });
		} catch (error) {
			debugLog('muteUser: Error', error);
			throw error;
		}
	}
};
