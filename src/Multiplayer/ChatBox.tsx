// Multiplayer/ChatBox.tsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { MessagingService } from './MessagingService';
import type { Message } from './Message';
import styles from './ChatBox.module.scss';
import { WebSocketService } from './WebSocketService';

interface ChatBoxProps {
  roomCode: string;
  webSocketService: WebSocketService;
  onFocusChange?: (isChatFocused: boolean) => void;
  isFocused: boolean;
  setIsFocused: any;
}

export default function ChatBox({ roomCode, webSocketService, onFocusChange, isFocused, setIsFocused }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadMessages();

    const handleChatMessage = (event: any) => {
      console.log('Received chat message via WebSocket:', event);

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
    };

    webSocketService.on('CHAT_MESSAGE', handleChatMessage);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (isFocused) {
          inputRef.current?.blur();
        } else {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      webSocketService.off('CHAT_MESSAGE', handleChatMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [roomCode, webSocketService, isFocused]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    onFocusChange?.(isFocused);
  }, [isFocused, onFocusChange]);

  const loadMessages = async () => {
    try {
      console.log('Loading messages for room:', roomCode);
      const roomMessages = await MessagingService.getRoomMessages(roomCode);
      console.log('Loaded messages:', roomMessages);
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
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      console.log('Sending message:', { roomCode, content: newMessage.trim() });

      const sentMessage = await MessagingService.sendMessage(user.id, {
        roomCode,
        content: newMessage.trim()
      });

      console.log('Message sent successfully:', sentMessage);

      setNewMessage('');

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.chatBox}>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>No messages yet. Say something nice!</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.userId === user?.id ? styles.ownMessage : ''
              }`}
            >
              <div className={styles.messageHeader}>
                <span className={styles.username}>
                  {message.userId === user?.id ? 'You' : (message.username || `User ${message.userId?.slice(0, 8)}`)}
                </span>
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
          onBlur={handleBlur}
          placeholder="Type a message... (Tab to switch focus)"
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
