import {google} from 'googleapis';
import {OAuth2Client} from 'google-auth-library';
import http from 'http';
import url from 'url';
import open from 'open';
import destroyer from 'server-destroy';
import FS from 'fs';

class YoutubeChat {

  authorized = false;
    constructor(oauthPath, tokensPath, serverCallbackHTTP){
      this.serverCallbackHTTP = serverCallbackHTTP || 'http://localhost:3000';
      try{
        let keysRaw = FS.readFileSync(oauthPath, 'utf8');
        this.keys = JSON.parse(keysRaw);
      }
      catch(err){
        console.error(err);
      }
      this.tokensPath = tokensPath
      this.oauthStart();
    }

    async oauthStart(){
      this.oAuth2Client = await this.getAuthenticatedClient();
      this.api = google.youtube({ version: 'v3', auth: this.oAuth2Client });
      this.authorized = true;
    }

  async getAuthenticatedClient() {
    return new Promise(async (resolve, reject) => {
  
      let refreshing = false;
      let refreshed = false;
      let cachedTokens;
  
      try{
        if(FS.existsSync(this.tokensPath)) {
          cachedTokens = FS.readFileSync('tokens', 'utf8');
          refreshing = true;
        }
      }
      catch(err) {
        console.err(err);
      }
  
      const oAuth2Client = new OAuth2Client(
        this.keys.web.client_id,
        this.keys.web.client_secret,
        this.keys.web.redirect_uris[0],
      );
      
      if(refreshing) {
        oAuth2Client.setCredentials({
          refresh_token: cachedTokens
        })
        await oAuth2Client.refreshAccessToken()
        refreshed = true;
      }
  
      if (refreshed){
        resolve(oAuth2Client);
        return;
      }
        
  
      // Generate the url that will be used for the consent dialog.
      const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
      });
  
      // Open an http server to accept the oauth callback. In this simple example, the
      // only request to our webserver is to /oauth2callback?code=<code>
      const server = http
        .createServer(async (req, res) => {
          try {
            if (req.url.indexOf('/oauth2callback') > -1) {
              // acquire the code from the querystring, and close the web server.
              const qs = new url.URL(req.url, this.serverCallbackHTTP)
                .searchParams;
              const code = qs.get('code');
              console.log(`Code is ${code}`);
              res.end('Authentication successful! Please return to the console.');
              server.destroy();
  
              // Now that we have the code, use that to acquire tokens.
              const r = await oAuth2Client.getToken(code);
              // Make sure to set the credentials on the OAuth2 client.
              oAuth2Client.setCredentials(r.tokens);
              try{
                FS.writeFileSync(this.tokensPath, r.tokens.refresh_token);
              }
              catch(err){
                console.error(err)
              }
              console.info('Tokens acquired.');
              resolve(oAuth2Client);
            }
          } catch (e) {
            reject(e);
          }
        })
        .listen(3000, () => {
          // open the browser to the authorize url to start the workflow
          console.log(`If the browser cannot be opened on your system, go here:`)
          console.log(authorizeUrl);
          open(authorizeUrl, {wait: false}).then(cp => cp.unref());
        });
      destroyer(server);
    });
  }
    
  async sendMessage(msg, chatId) {
    await this.checkAuthorization();
      this.api.liveChatMessages.insert({
        "part":'snippet',
        "resource":{
          "snippet":{
            "type":"textMessageEvent",
            "liveChatId": chatId,
            "textMessageDetails":{
              "messageText": msg
            }
          }
        }
      }, function(err,response){
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        } else {
          console.log(response);
        }
      });
  }
  
  async getChatId(streamid){
    await this.checkAuthorization();
    const list = await this.api.videos.list({
      "part": [
        "liveStreamingDetails"
      ],
      "id": [
        streamid
      ]  
    })
    return list.data.items[0].liveStreamingDetails.activeLiveChatId;
  }

  async getLatestLiveStream(channelId){
    await this.checkAuthorization();
    channelId = await this.checkChannel(channelId);
    const list = await this.api.search.list({
      "part": "snippet",
      "channelId": channelId,
      "eventType": "live",
      "type": "video"
    })
    return list.data.items[0].id.videoId;
  }

  async getChannelId(channelName) {
    await this.checkAuthorization();
    const list = await this.api.search.list({
      "part": "snippet",
      "q": channelName,
      "type": "channel"
    })
    return list.data.items[0].id.channelId
  }

  async getLatestChatId(channelId){
    let livestreamId = await this.getLatestLiveStream(channelId);
    let chatId = await this.getChatId(livestreamId);
    return chatId;
  }

  async sendMessageToChannel(msg, channelId) {
    let chatId = await this.getLatestChatId(channelId);
    this.sendMessage(msg, chatId);
  }

  async checkAuthorization() {
    if(!this.authorized){
      while(!this.authorized){
        await new Promise(r => setTimeout(r, 1000));//block the function until we're authorized.
      }
    }
  }
  
  async checkChannel(channelName){
    if(channelName.length == 24 && channelName.startsWith("UC")){
      return channelName;
    }
    return this.getChannelId(channelName);
  }
}

export default YoutubeChat;
