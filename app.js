import { LiveChat } from "youtube-chat";
import { WebSocketServer } from 'ws';
import YoutubeChat from './youtubeChatBotModule.js';
import FS from 'fs';
import tmi from 'tmi.js';
import { v4 as uuidv4 } from 'uuid';

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
var knownIds = new Object;
try{
  let rawData = FS.readFileSync('./tmi.credentials.json');
  tmiIdentity = JSON.parse(rawData);
  if(FS.existsSync('./channels.json')){
    let channelsRaw = FS.readFileSync('./channels.json')
    knownIds = JSON.parse(channelsRaw);
  }
}
catch(err){
  console.error(err);
}

const tmiClient = new tmi.Client({
	options: { debug: true },
	identity: tmiIdentity,
});

tmiClient.connect();

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
    ws.uuid = uuidv4();
    ws.waiting = true;
    ws.isAlive = true;
    ws.livechatStart = false;
    ws.tmiMessage = new Object;
    ws.send("Connected");
    ws.on('pong', heartbeat);
    console.log(`connection received from: ${ws.ip}`)
      ws.on('close', async function close() {
        console.log(`Connection closed: ${ws.ip}`)
        clearInterval(interval);
        if(ws.livechatStart) {
          ws.liveChat.stop();
          tmiClient.part(ws.twitchChannel)
          tmiClient.off("message", ws.tmiMessage[ws.uuid]);
        }
      });
      ws.on('message', async function message(data) {
        try{
        const params = JSON.parse(data);
        ws.twitchChannel = params.forward;
        if(params.channelName) {
          if(typeof knownIds[params.channelName] == 'undefined'){
            knownIds[params.channelName] = await ytc.getChannelId(params.channelName);
            FS.writeFileSync('./channels.json', JSON.stringify(knownIds, null, 2));
          }
          params.id = knownIds[params.channelName]
        }
        if(params.id.length == 24 && params.id.startsWith("UC")){
            ws.liveChat = new LiveChat({channelId: params.id})
        }
        else{
            ws.liveChat = new LiveChat({liveId: params.id})
        }
        ws.liveChat.on("start", async (liveId) => {          
          ws.liveId = liveId;
          ws.livechatStart = true;
          ws.youtubeChatId = await ytc.getChatId(ws.liveId);
        })
        try{
          await ws.liveChat.start()
        }
        catch(e){
          console.error(e)
          ws.send("400");
          ws.close();
          return;
        }
        
        if(ws.twitchChannel){
          ws.tmiMessage[ws.uuid] = (channel, userstate, message, self) => {
            if(self) return;
            console.log("sending twitch message to youtube")
            console.log(channel, message)
            if(channel == `#${ws.twitchChannel.toLowerCase()}` && !message.startsWith("[YouTube]")) {
              
              if(userstate['message-type' == 'action']) {
                message = `*${message}*`
              }
              message = `[Twitch] ${userstate['display-name']}: ${message}`
              ytc.sendMessage(message, ws.youtubeChatId)
            }
          }
          tmiClient.join(ws.twitchChannel)
          tmiClient.on("message", ws.tmiMessage[ws.uuid])
        }
        setTimeout(() => {
          ws.waiting = false;//wait 5 seconds before we actually send messages so that the old stuff isn't sent.
        }, 5000);
        ws.liveChat.on("chat", (chatItem) => {
            if(ws.waiting) return;

            ws.send(JSON.stringify(chatItem))
            if(ws.twitchChannel){
                let msg = parseMessage(chatItem.message);
                if(msg.startsWith('[Twitch]')) return;
                let messageBuilder = `[YouTube] ${chatItem.author.name}: ${msg}`;
                tmiClient.say(ws.twitchChannel, messageBuilder);
            }
          })
        ws.liveChat.on("error", (err) => {
            ws.send(JSON.stringify(err));
        })
        ws.liveChat.on("end", (reason) => {
          console.log(reason);
          ws.send("410");
          ws.liveChat.stop();
          tmiClient.part(ws.twitchChannel)
          tmiClient.off("message", ws.tmiMessage[ws.uuid]);
          ws.livechatStart = false;
          ws.close();
        })
        }
        catch(e){
            console.error(e)
            ws.send(`401`)
            console.error("Invalid data received from client", e)
        }
      });
  });
  
  const interval = setInterval(function ping() {
  wss.clients.forEach(async function each(ws) {
    if (ws.isAlive === false) {
    ws.liveChat.stop();
    tmiClient.part(ws.twitchChannel)
    tmiClient.off("message", ws.tmiMessage[ws.uuid]);
    ws.liveChat = null;
    return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason.stack);
  // application specific logging, throwing an error, or other logic here
});

