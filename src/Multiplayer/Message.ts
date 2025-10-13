
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  sentAt: string;
  username?: string;
}

export interface SendMessageData {
  roomCode: string;
  content: string;
}


