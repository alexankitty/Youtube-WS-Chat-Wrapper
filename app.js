import { LiveChat } from "youtube-chat";
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 8080,
  perMessageDeflate: {
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    //concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024, // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
    clientTracking: true
  }
});


function heartbeat() {
    this.isAlive = true;
  }

wss.on('connection', function connection(ws, req) {
    ws.ip = req.socket.remoteAddress;
    let ipCheck = ws.ip;
    let connectionCount = 0;
    wss.clients.forEach(function each(ws) {
        if(ipCheck == ws.ip) {
            if(connectionCount > 1) {
            ws.send("503");
            ws.close();
            }
            connectionCount++;
        }
    })
    ws.liveChat;
    ws.isAlive = true;
    ws.send("Connected");
    ws.on('pong', heartbeat);
    console.log(`connection received from: ${ws.ip}`)
      ws.on('close', function close() {
        console.log(`Connection closed: ${ws.ip}`)
        clearInterval(interval);
        ws.liveChat.stop();
      });
      ws.on('message', async function message(data) {
        try{
        const params = JSON.parse(data);
        if(params.id.length == 11){
            ws.liveChat = new LiveChat({liveId: params.id})
        }
        else{
            ws.liveChat = new LiveChat({channelId: params.id})
        }
        const ok = await ws.liveChat.start()
        if (!ok) {
            ws.send(`400`)
        }
        ws.liveChat.on("chat", (chatItem) => {
            ws.send(JSON.stringify(chatItem))
          })
        ws.liveChat.on("error", (err) => {
            ws.send(JSON.stringify(err));
        })
        }
        catch(e){
            ws.send(`401`)
            console.error("Invalid data received from client", e)
        }
      });
  });
  
  const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.liveChat.stop();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);