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
* Test it out with the included ytchat.html. Set the id to either the channel id you wish to observer or the live stream id. The server will attempt to figure it out.

