const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ejs = require('ejs');

const app = express();
const server = http.Server(app);
const io = socketIo(server);

const PORT = 3000;
const chats = {};

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

app.get('/', (request, response) => {
  response.render('index');
});

app.get('/chat.html', (request, response) => {
  const { chatname, username } = request.query;

  if (!chatname || !username) {
    response.render('index');
  }

  response.render('chat', { chatname, username });
});

app.use('/assets', express.static(__dirname + '/assets'));

io.on('connection', socket => {
  let username = '';
  let loggedUserChatname = '';

  socket.on('join chat', ({ chatname, name }) => {
    loggedUserChatname = chatname;
    username = name;
    let chat = chats[chatname];
    if (!chat) {
      chats[chatname] = {
        connectedUsers: [],
      };

      chat = chats[chatname];
    }

    if (chat.connectedUsers.includes(name)) {
      socket.emit('invalid session');
      return;
    }

    chat.connectedUsers.push(name);

    socket.join(chatname);
    io.in(loggedUserChatname).emit('join chat', chat);
  });

  socket.on('chat message image', ({ file, name, chatname, type }) => {
    const date = new Date();

    const time = `${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes(),
    ).padStart(2, '0')}`;

    io.in(chatname).emit('chat message image', { file, name, time, type });
  });

  socket.on('chat message', ({ message, name, chatname }) => {
    const date = new Date();

    const time = `${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes(),
    ).padStart(2, '0')}`;

    io.in(chatname).emit('chat message', { message, name, time });
    io.in(chatname).emit('no longer typing message', { name });
  });

  socket.on('typing message', ({ name, chatname }) => {
    io.in(chatname).emit('typing message', { name });
  });

  socket.on('no longer typing message', ({ name, chatname }) => {
    io.in(chatname).emit('no longer typing message', { name });
  });

  socket.on('disconnect', () => {
    const chat = chats[loggedUserChatname];
    if (!chat) return;
    chat.connectedUsers = chat.connectedUsers.filter(el => el !== username);
    io.in(loggedUserChatname).emit('user disconnected', { name: username });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
