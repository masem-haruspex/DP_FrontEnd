// Multiplayer/ChatBox.tsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { MessagingService } from './MessagingService';
import type { Message } from './Message';
import styles from './ChatBox.module.scss';
import { WebSocketService } from './WebSocketService';
import { useAtom } from 'jotai';
import { guestIdAtom } from '../atoms/auth';

interface ChatBoxProps {
  roomCode: string;
  webSocketService: WebSocketService;
  showUI: () => void;
}

const DEBUG = false;

export default function ChatBox({ roomCode, webSocketService, showUI }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const [guestId] = useAtom(guestIdAtom);
  const currentUserId = user?.id || guestId;
  const visibleMessages = messages.filter(message => !mutedUsers.has(message.userId));

  const hideTimeoutRef = useRef<NodeJS.Timeout>(null);

  const toggleMuteUser = (userId: string) => {
    setMutedUsers(prev => {
      const newMuted = new Set(prev);
      if (newMuted.has(userId)) {
        newMuted.delete(userId);
      } else {
        newMuted.add(userId);
      }
      return newMuted;
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' && target !== inputRef.current) {
    return;
  }

  if (e.key === 'Enter' && !isInputFocused && target !== inputRef.current) {
    e.preventDefault();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }
};

  const loadMessages = async () => {
    try {
      if(DEBUG) console.log('Loading messages for room:', roomCode);
      const roomMessages = await MessagingService.getRoomMessages(roomCode);
      if(DEBUG) console.log('Loaded messages:', roomMessages);
      setMessages(roomMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      if(DEBUG) console.log('Sending message:', { roomCode, content: newMessage.trim() });

      const sentMessage = await MessagingService.sendMessage(currentUserId, {
        roomCode,
        content: newMessage.trim()
      });

      if(DEBUG) console.log('Message sent successfully:', sentMessage);

      setNewMessage('');

      setIsInputFocused(false);
      inputRef.current?.blur();

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFocus = () => {
    setIsInputFocused(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const savedMutedUsers = localStorage.getItem(`mutedUsers_${roomCode}`);
    if (savedMutedUsers) {
      setMutedUsers(new Set(JSON.parse(savedMutedUsers)));
    }
  }, [roomCode]);

  useEffect(() => {
    localStorage.setItem(`mutedUsers_${roomCode}`, JSON.stringify([...mutedUsers]));
  }, [mutedUsers, roomCode]);

  useEffect(() => {
    loadMessages();

    const handleChatMessage = (event: any) => {
      if(DEBUG) console.log('Received chat message via WebSocket:', event);

      const messageData = event.payload || event;

      const newMessage: Message = {
        id: messageData.id || messageData.messageId || `temp-${Date.now()}-${Math.random()}`,
        roomId: roomCode,
        userId: messageData.userId,
        content: messageData.message || messageData.content,
        sentAt: new Date(messageData.timestamp || messageData.sentAt || Date.now()).toISOString(),
        username: messageData.username || `User ${messageData.userId?.slice(0, 8)}`
      };

      setMessages(prev => [...prev, newMessage]);
      showUI();
    };

    webSocketService.on('CHAT_MESSAGE', handleChatMessage);

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      webSocketService.off('CHAT_MESSAGE', handleChatMessage);
      window.removeEventListener('keydown', handleKeyDown);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [roomCode, webSocketService]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={styles.chatBox}>
      <div className={styles.messagesContainer}>
        {visibleMessages.length === 0 ? (
          <div className={styles.noMessages}>Press Enter to chat</div>
        ) : (
          visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.userId === currentUserId ? styles.ownMessage : '' 
              }`}
            >
              <div className={styles.messageHeader}>
                <span className={styles.username}>
                  {message.userId === currentUserId ? 'You' : (message.username || `User ${message.userId?.slice(0, 8)}`)} {/* FIXED */}
                </span>
                {message.userId !== currentUserId && ( 
                  <button
                    onClick={() => toggleMuteUser(message.userId)}
                    className={`${styles.muteButton} ${mutedUsers.has(message.userId) ? styles.muted : ''}`}
                    title={mutedUsers.has(message.userId) ? 'Unmute user' : 'Mute user'}
                  >
                    {mutedUsers.has(message.userId) ? '🔇' : '🔊'}
                  </button>
                )}
                <span className={styles.timestamp}>
                  {formatTime(message.sentAt)}
                </span>
              </div>
              <div className={styles.messageContent}>
                {message.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className={styles.messageForm}>
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onFocus={handleFocus}
          placeholder="Type a message... (Enter to chat, Esc to close)"
          className={styles.messageInput}
          disabled={isLoading}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={isLoading || !newMessage.trim()}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
