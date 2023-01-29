# Youtube-WS-Chat-Wrapper
This project is designed to be used with my other project [Holo-Chat](https://github.com/alexankitty/Holo-Chat). Due to google thinking 43 seconds is enough time to query the API for live chat messages, currently this is the ideal way to implement this without making the CORS gods angry.  
This software is alpha quality, use at your own risk.

## Basic Directions
* Run the following commands to install the necessary dependencies.
```shell
npm install
```  
This should grab every package listed in the package files.  
or substitute accordingly with yarn.

## API Setup
1. Go to [Google Cloud Platform](https://console.cloud.google.com) and make a new project for this application (or use an existing one if you have it.
2. Once your project has been created, select the project. (Either from the notification at the top right or the drop down at the top left)
3. At the project dashboard, click the menu button at the top left. Then go to API & Services and then go to Library.
4. Search for YouTube Data API v3 and then click enable.
5. Go back to the menu button, then go to API & Services and then oauth consent screen.
6. Select External, click create.
7. Fill out the form however you wish.
8. At the scopes screen you can just click next.
9. Under test users click add users and then whichever emails will be accessing this oauth scope. (Hint: it should be whichever one your youtube bot account is tied to)
10. Go to credentials, create credentials, OAuth Client ID.
11. Click Web Client, name it whatever you want. For your authorized redirect URI, it can only be a domain name. The chatbot module defaults to http://localhost:3000/oauth2callback but this can be changed accordingly.
12. Once done, you'll be given your secret and clientID. Make sure to click download json and rename it to oauth2.keys.json and place it in the same directory as app.js
13. Fill out tmi.credentials.example.json and rename it to tmi.credentials.json. You can get an oauth token from https://twitchapps.com/tmi/
14. Finish up setup with [Holo-Chat](https://github.com/alexankitty/Holo-Chat)

* Start the program with `node app.js`
* The program should open your web browser and begin oauth, if it can't be opened it'll also post the oauth link in the terminal window and listen for the token.
* If the standard oauth flow isn't an option/isn't working, you can get a refresh token from [Google's OAuth Playground](https://developers.google.com/oauthplayground/) and click the settings gear at the top right and input your own OAuth credentials (you will need to pull these out from your json file you downloaded earlier. You will want to place your refresh token in a file called tokens. This application does not save the auth token, only the refresh token.
* Test it out with the included ytchat.html. Set the id to either the channel id you wish to observe or the live stream id. The server will attempt to figure it out.
* Recommendation: Use something like [NSSM](https://nssm.cc/) to install as a service. Point application to your node path, working directory to where you cloned this repo, and argument to app.js. Makesure to also set stdout and stderr to output.log in the same folder so you can still see the output. Lastly make sure it replaces the file so it doesn't get too large.

## Known Issues
1. API Cost. It's 21 quota to send a message. You're guaranteed to blow through this in roughly 500 messages. The only fix for this is to increase the quota limit, which I think is unlikely to receive approval. 
2. Upon multiple connections it's possible to cause tmi to double part resulting in an unresolved promise. I don't think this is an actual issue, and to fix it would require way too much refactoring.

## Miscellaneous
* There's an included html page for an example of building your own overlay to receive chat from if that's something you're interested in. You can also look over the implementation [Holo-Chat](https://github.com/alexankitty/Holo-Chat) uses.
