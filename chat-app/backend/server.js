const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users
const users = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user joining
  socket.on('user_join', (data) => {
    const { username } = data;
    users.set(socket.id, username);
    socket.broadcast.emit('user_joined', {
      username: username,
      message: `${username} joined the chat`,
      timestamp: new Date()
    });
    console.log(`${username} joined the chat`);
  });

  // Handle incoming messages
  socket.on('send_message', (data) => {
    const username = users.get(socket.id);
    const messageData = {
      username: username,
      message: data.message,
      timestamp: new Date()
    };
    io.emit('receive_message', messageData);
    console.log('Message received:', messageData);
  });

  // Handle user typing
  socket.on('typing', (data) => {
    const username = users.get(socket.id);
    socket.broadcast.emit('user_typing', {
      username: username,
      isTyping: data.isTyping
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      socket.broadcast.emit('user_left', {
        username: username,
        message: `${username} left the chat`,
        timestamp: new Date()
      });
      users.delete(socket.id);
      console.log(`${username} left the chat`);
    }
    console.log('A user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});