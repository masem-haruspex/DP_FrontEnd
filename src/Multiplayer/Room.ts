// Multiplayer/Room.ts
import * as z from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100, 'Room name must be less than 100 characters'),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  maxParticipants: z.number().min(2).max(10).default(2),
});

export type CreateRoomData = z.infer<typeof CreateRoomSchema>;

export interface Room {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  isPrivate: boolean;
  password?: string;
  participantCount?: number;
  maxParticipants: number;
  createdAt: string;
}
