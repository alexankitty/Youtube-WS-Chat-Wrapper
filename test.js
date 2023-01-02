import YoutubeChat from './YoutubeChatBotModule.js'

async function main(){
    let ytc = new YoutubeChat("./oauth2.keys.json", "./newTokens");
    ytc.sendMessageToChannel("channel name test", "alexankitty")
}

main().catch(console.error)