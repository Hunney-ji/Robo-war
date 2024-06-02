const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: '*', // Allow all origins
    credentials: true, 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['Access-Control-Allow-Origin'] // Expose the Access-Control-Allow-Origin header
};


app.use(cors(corsOptions));

app.get("/", (req, res) => {
    res.json("Hello");
 });

const io = new Server(server, {
    cors: corsOptions
});

const users = {};
const socketToRoom = {};

io.use((socket, next) => {
    const socketID = socket.handshake.auth.socketID;
    if (socketID) {
        socket.id = socketID;
    }
    next();
});

io.on('connection', socket => {
    console.log("User connected:", socket.id);

    socket.on("join room", roomID => {
        if (users[roomID]) {
            if (!users[roomID].includes(socket.id)) {
                users[roomID].push(socket.id);
            }
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;

        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        socket.emit("all users", usersInThisRoom);
        console.log(users);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
        delete socketToRoom[socket.id];

        if (roomID) {
            io.to(roomID).emit('refresh');
        }
    });

    // socket.on('refresh page', () => {
    //     const roomID = socketToRoom[socket.id];
    //     if (roomID) {
    //         socket.to(roomID).emit('refresh');
    //     }
    // });
});

server.listen(8000, () => console.log('Server is running on port 8000'));
