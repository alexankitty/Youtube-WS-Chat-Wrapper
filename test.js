import YoutubeChat from './YoutubeChatBotModule.js'

async function main(){
    let ytc = new YoutubeChat("./oauth2.keys.json", "./newTokens");

}

main().catch(console.error)