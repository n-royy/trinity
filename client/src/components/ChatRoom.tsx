import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id?: string; // Optional, might be assigned by backend
  senderId: string; // The ID of the user who sent the message
  username?: string; // Display name of the sender
  content: string;
  timestamp: string; // ISO 8601 string
}

const SOCKET_SERVER_URL = 'http://localhost:3001'; // Assuming WebSocket server runs on port 3001 as per common practice for a separate messaging service

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState<string>('');
  const [currentUserUsername, setCurrentUserUsername] = useState<string>('GuestUser'); // Simulate a logged-in user
  const [currentUserId, setCurrentUserId] = useState<string>('guest_id_123'); // Simulate a logged-in user ID
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      // Optionally, you might send a 'joinRoom' event or similar here
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    // Listen for incoming messages
    socket.on('receiveMessage', (message: Message) => {
      console.log('Received message:', message);
      setMessages((prevMessages) => {
        // Prevent duplicate messages if the server somehow re-emits, 
        // though proper server implementation should avoid this.
        if (message.id && prevMessages.some(msg => msg.id === message.id)) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });
    });

    // Clean up on component unmount
    return () => {
      console.log('Cleaning up socket connection...');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Scroll to the latest message whenever messages update
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (newMessageContent.trim() && socketRef.current?.connected) {
      const messageToSend: Omit<Message, 'timestamp' | 'id'> = {
        senderId: currentUserId,
        username: currentUserUsername,
        content: newMessageContent.trim(),
      };

      // Emit the message to the server
      socketRef.current.emit('sendMessage', messageToSend, (response: any) => {
        // Optional: Acknowledge from server if message was processed/saved
        if (response.status === 'ok') {
          console.log('Message sent successfully:', response.message);
          // Server usually broadcasts the message back to all clients, 
          // including the sender, so we don't add it to state here directly.
          // If the server *doesn't* broadcast, we'd add it here.
        } else {
          console.error('Failed to send message:', response.error);
        }
      });

      setNewMessageContent('');
    } else if (!socketRef.current?.connected) {
      console.warn('Cannot send message: Socket not connected.');
    }
  };

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' +
             date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div style={styles.chatRoomContainer}>
      <h2 style={styles.header}>Real-time Chat</h2>
      <div style={styles.messageDisplayArea}>
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>No messages yet. Start chatting!</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id || index} // Use msg.id if available, otherwise index (less ideal for lists that reorder/remove)
              style={msg.senderId === currentUserId ? styles.myMessage : styles.otherMessage}
            >
              <div style={styles.messageHeader}>
                <span style={styles.senderName}>
                  {msg.senderId === currentUserId ? 'You' : (msg.username || `User (${msg.senderId.substring(0, 4)}...)`)}
                </span>
                <span style={styles.timestamp}>
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
              <p style={styles.messageContent}>{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} style={styles.messageInputForm}>
        <input
          type="text"
          value={newMessageContent}
          onChange={(e) => setNewMessageContent(e.target.value)}
          placeholder="Type your message..."
          style={styles.messageInputField}
          disabled={!socketRef.current?.connected}
        />
        <button
          type="submit"
          style={styles.sendButton}
          disabled={!newMessageContent.trim() || !socketRef.current?.connected}
        >
          Send
        </button>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  chatRoomContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '600px',
    height: '80vh',
    margin: '20px auto',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '15px',
    margin: 0,
    textAlign: 'center',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  messageDisplayArea: {
    flexGrow: 1,
    padding: '15px',
    overflowY: 'auto',
    backgroundColor: '#f9f9f9',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  messageInputForm: {
    display: 'flex',
    padding: '15px',
    borderTop: '1px solid #eee',
    backgroundColor: '#fff',
  },
  messageInputField: {
    flexGrow: 1,
    padding: '10px 15px',
    border: '1px solid #ccc',
    borderRadius: '20px',
    marginRight: '10px',
    fontSize: '16px',
  },
  sendButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
    borderRadius: '12px 12px 2px 12px',
    padding: '8px 12px',
    maxWidth: '70%',
    wordWrap: 'break-word',
    boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e2e2',
    borderRadius: '12px 12px 12px 2px',
    padding: '8px 12px',
    maxWidth: '70%',
    wordWrap: 'break-word',
    boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '4px',
  },
  senderName: {
    fontWeight: 'bold',
    marginRight: '8px',
    fontSize: '0.9em',
    color: '#333',
  },
  timestamp: {
    fontSize: '0.75em',
    color: '#666',
  },
  messageContent: {
    margin: 0,
    fontSize: '1em',
    lineHeight: '1.4',
  },
};

export default ChatRoom;
