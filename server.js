const fs = require("fs");
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.port || 3000;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
})
app.use(express.static(__dirname + '/client'));

io.on("connection", async socket => {
    // Signaling
    socket.on('call', sdpOffer => {
        socket.broadcast.emit('call', sdpOffer);
    });

    socket.on('answer', sdpAnswer => {
        socket.broadcast.emit('answer', sdpAnswer);
    })

    // ICE
    socket.on('ice', candiadate => {
        socket.broadcast.emit('ice', candiadate);
    })
})

http.listen(PORT, () => console.log(`Started on port ${PORT}`))