import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState(['😀', '😂', '❤️', '👍', '🎉']);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Common emojis for quick selection
  const commonEmojis = ['😀', '😂', '🥰', '😎', '👍', '❤️', '🎉', '🤔', '👏', '🙏'];

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Handle connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    // Listen for messages
    newSocket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Listen for user join/leave events
    newSocket.on('user_joined', (data) => {
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('user_left', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Listen for typing events
    newSocket.on('user_typing', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      } else {
        setTypingUsers(prev => prev.filter(user => user !== data.username));
      }
    });

    // Close emoji picker when clicking outside
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up on unmount
    return () => {
      newSocket.close();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim() && socket) {
      socket.emit('user_join', { username: username.trim() });
      setIsJoined(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket) {
      socket.emit('send_message', { message: message.trim() });
      setMessage('');
      setShowEmojiPicker(false);
      
      // Notify server that user stopped typing
      socket.emit('typing', { isTyping: false });
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (socket) {
      if (e.target.value.trim()) {
        socket.emit('typing', { isTyping: true });
      } else {
        socket.emit('typing', { isTyping: false });
      }
    }
  };

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    
    // Add to recent emojis
    setRecentEmojis(prev => {
      const newRecents = [...prev];
      if (!newRecents.includes(emoji)) {
        newRecents.unshift(emoji);
        if (newRecents.length > 8) newRecents.pop();
      }
      return newRecents;
    });
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isConnected) {
    return (
      <div className="container">
        <div className="connection-status">Connecting to server...</div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="container">
        <div className="login-form">
          <h1>Join Chat Room</h1>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <button type="submit">Join Chat</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="chat-container">
        <div className="chat-header">
          <h2>Real-Time Chat</h2>
          <div className="status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="messages-container">
          {messages.map((msg, index) => {
            const isMyMessage = msg.username === username;
            const isSystemMessage = !msg.username || msg.message.includes('joined') || msg.message.includes('left');
            
            let messageClass = 'other-message';
            if (isMyMessage) messageClass = 'my-message';
            if (isSystemMessage) messageClass = 'system-message';
            
            return (
              <div key={index} className={`message ${messageClass}`}>
                {!isSystemMessage && (
                  <div className="message-header">
                    <span className="username">{msg.username}</span>
                    <span className="timestamp">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                <div className="message-content">{msg.message}</div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
        </div>

        <div className="typing-indicator">
          {typingUsers.length > 0 && (
            <p>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
              <span></span><span></span><span></span>
            </p>
          )}
        </div>

        {/* Simple Emoji Bar */}
        <div className="emoji-bar">
          {commonEmojis.map((emoji, index) => (
            <button
              key={index}
              className="emoji-btn"
              onClick={() => addEmoji(emoji)}
              aria-label={`Add ${emoji} emoji`}
            >
              {emoji}
            </button>
          ))}
          <button 
            className="emoji-picker-toggle"
            onClick={toggleEmojiPicker}
            aria-label="Toggle emoji picker"
          >
            😊
          </button>
        </div>

        {showEmojiPicker && (
          <div className="emoji-picker" ref={emojiPickerRef}>
            <div className="emoji-picker-header">
              <h3>Select an Emoji</h3>
              <button 
                className="emoji-picker-close"
                onClick={() => setShowEmojiPicker(false)}
                aria-label="Close emoji picker"
              >
                ×
              </button>
            </div>
            <div className="emoji-grid">
              {commonEmojis.map((emoji, index) => (
                <button
                  key={index}
                  className="emoji-option"
                  onClick={() => addEmoji(emoji)}
                  aria-label={`Add ${emoji} emoji`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={handleTyping}
            required
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;