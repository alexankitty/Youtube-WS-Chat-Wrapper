import { LiveChat } from "youtube-chat";
import { WebSocketServer } from 'ws';
import YoutubeChat from './youtubeChatBotModule.js';
import FS from 'fs';
import tmi from 'tmi.js';

function parseMessage(msgArr) {
  let message = "";
  for(let i = 0; i < msgArr.length; i++) {
    for(let key in msgArr[i]) {
      if(key.includes('text')) {
        message += msgArr[i][key]
      }
      if(key.includes('emojiText')) {
        message += msgArr[i][key]
      }
    }
  }
  return message;
}

const wss = new WebSocketServer({
  port: 8081,
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

const ytc = new YoutubeChat("./oauth2.keys.json", "tokens");
var tmiIdentity;
try{
  let rawData = FS.readFileSync('./tmi.credentials.json');
  tmiIdentity = JSON.parse(rawData);
}
catch(err){
  console.error(err);
}

const tmiClient = new tmi.Client({
	options: { debug: true },
	identity: tmiIdentity,
});

tmiClient.connect();
tmiClient

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
    ws.waiting = true;
    setTimeout(() => {
      ws.waiting = false;//wait 5 seconds before we actually send messages so that the old stuff isn't sent.
    }, 5000);
    ws.isAlive = true;
    ws.send("Connected");
    ws.on('pong', heartbeat);
    console.log(`connection received from: ${ws.ip}`)
      ws.on('close', function close() {
        console.log(`Connection closed: ${ws.ip}`)
        clearInterval(interval);
        ws.liveChat.stop();
        tmiClient.channels[ws.tmiId] = null;
        tmiClient.disconnect();
        tmiClient.connect();
      });
      ws.on('message', async function message(data) {
        try{
        const params = JSON.parse(data);
        const twitchChannel = params.forward;

        if(params.channelName) {
          params.id = await ytc.getChannelId(params.channelName);
        }
        let channelName = params.id;
        if(twitchChannel){
          tmiClient.channels.push(twitchChannel)
          ws.tmiId = tmiClient.channels.length; 
          tmiClient.connect()
          tmiClient.on("message", (channel, userstate, message, self) => {
            if(self) return;
            console.log("sending twitch message to youtube")
            console.log(channel, message)
            if(channel == `#${twitchChannel.toLowerCase()}` && !message.startsWith("[YouTube]")) {
              
              if(userstate['message-type' == 'action']) {
                message = `*${message}*`
              }
              message = `[Twitch] ${userstate['display-name']}: ${message}`
              ytc.sendMessageToChannel(message, channelName)
            }
          })
        }
        if(params.id.length == 24 && channelName.startsWith("UC")){
            ws.liveChat = new LiveChat({channelId: params.id})
        }
        else{
            ws.liveChat = new LiveChat({liveId: params.id})
        }
        const ok = await ws.liveChat.start()
        console.log(ws.liveChat)
        if (!ok) {
            ws.send(`400`)
        }
        ws.liveChat.on("chat", (chatItem) => {
            if(ws.waiting) return;

            ws.send(JSON.stringify(chatItem))
            if(twitchChannel){
                let msg = parseMessage(chatItem.message);
                if(msg.startsWith('[Twitch]')) return;
                let messageBuilder = `[YouTube] ${chatItem.author.name}: ${msg}`;
                tmiClient.say(twitchChannel, messageBuilder);
            }
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
    if (ws.isAlive === false) {
    ws.liveChat.stop();
    tmiClient.channels[ws.tmiId] = null;
    tmiClient.disconnect();
    tmiClient.connect();
    ws.liveChat = null;
    return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);