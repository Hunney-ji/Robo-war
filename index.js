const express = require('express');
const http = require('http');
const https=require('https');
const fs=require('fs');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const options = {
    key: fs.readFileSync('certifi/key.pem'),
    cert: fs.readFileSync('certifi/cert.pem')
};

const server = https.createServer(options,app);

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://robocon-pr.vercel.app"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS,CONNECT,TRACE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Content-Type-Options, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Private-Network", true);
  //  Firefox caps this at 24 hours (86400 seconds). Chromium (starting in v76) caps at 2 hours (7200 seconds). The default value is 5 seconds.
  res.setHeader("Access-Control-Max-Age", 7200);

  next();
});

const corsOptions = {
    origin: 'https://localhost:3000',
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

// io.use((socket, next) => {
//     const socketID = socket.handshake.auth.socketID;
//     if (socketID) {
//         socket.id = socketID;
//     }
//     next();
// });

io.on('connection', socket => {
    console.log("User connected:", socket.id);
    socket.emit("j","j");
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
app.get("/crt",(req,res)=>{
    res.send("hello==");
})

server.listen(8000, () => console.log('Server is running on port 8000'));
