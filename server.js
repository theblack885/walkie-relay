const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });
const waiting = {};

wss.on('connection', (ws) => {
    let room = null;

    ws.once('message', (msg) => {
        room = msg.toString().slice(0, 4);
        const peer = waiting[room];
        if (peer && peer.readyState === WebSocket.OPEN) {
            delete waiting[room];
            ws.peer = peer;
            peer.peer = ws;

            const relay = (from, to) => {
                from.on('message', (data) => {
                    if (to.readyState === WebSocket.OPEN) to.send(data);
                });
            };
            relay(ws, peer);
            relay(peer, ws);

            ws.send('PAIRED');
            peer.send('PAIRED');
            const hb = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN && peer.readyState === WebSocket.OPEN) {
                    ws.send('HB'); peer.send('HB');
                } else {
                    clearInterval(hb);
                }
            }, 2000);
        } else {
            waiting[room] = ws;
        }
    });

    ws.on('close', () => {
        if (room && waiting[room] === ws) delete waiting[room];
        if (ws.peer) ws.peer.close();
    });
    ws.on('error', () => {});
});

console.log('Relay chal raha hai, port ' + PORT);
