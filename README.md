discord-xmpp
===================

A bot for Discord that transfers chat messages between a Discord channel and a XMPP-based Multi-user Chatroom (MUC). It runs on node.js, and utilizes discord.js, node-xmpp-client, and tinyurl. 

**Installation**
-------------

**You need all of the following before you start:**
> - A working installation of Node.js on the machine this bot will run on. You can get it at https://nodejs.org
> - Access to the Discord account that created the server the Discord chatroom lives on.
> - The ID number of the Discord chatroom the bot will listen to. You can get it by logging into the web version of Discord at "discord.gg",  and browsing to the chatroom. It's in the URL as the last number, like the following example: https://discordapp.com/channels/SERVER_ID/CHATROOM_ID
> - An account on the XMPP server that the bot will run under, also known as a JID (Jabber ID). It's usually something like: "username@XmppServerName"
> - The JID of the chatroom on your XMPP server. It tends to look like: "chatroom@conference.XmppServerName"

**Now, lets begin**

1. Log into the Discord Developer's site at "https://discordapp.com/developers/applications/me" using the server owner's account.
2. Click on "New Application"
3. Type a meaningful name under "APP NAME*". This is name of the bot-user XMPP chat will appear from.
4. If you want, click on "App Icon" to upload an image for your bot to use as an avatar.
5. When done, click "Create Application" at the bottom of the page.
6. At the next page, click on the "click to reveal" link under "App Details"
7. Click on the "Create a Bot User" button, and then the "Yes. Do it!" button.
8. Under "App Bot User", click on the "click to reveal" link, and copy that token somewhere temporarily. You will need it later.
9. Click 'Save Changes'
10. Under "App Details", copy the "Client/Application ID" and put it somewhere for a moment, you'll need it for the next step
11. Change the following URL to use the Client ID you just copied, and browse to it: https://discordapp.com/oauth2/authorize?client_id=PUT_YOUR_CLIENT_ID_HERE&scope=bot&permissions=0
12. Click on the dropdown box under "Add a bot to a server", select the server your chatroom is in, and click the "Authorize" button.
13. We're now done with the Discord side. Now to setup the bot

14. Clone this repo to your desired folder
15. Open your command line and browse to the folder
16. Type "npm install --save" and press enter. This may take a few moments to complete
17. Open "app.js" using a text editor, and turn your attention to first five lines.
18. On line 2, replace 'YOUR_DISCORD_API_TOKEN' with the token you got earlier. Make sure to keep it in 'quotes'
19. On line 3, replace 'YOUR_DISCORD_CHATROOM_ID' with the id of the chatroom you want this to listen on. Again, make sure to keep it in 'quotes'
20. On line 4, replace 'username@XmppServerName/alias' with the JID and alias you want to use. (The "username@XmppServerName" is mandatory while the "/alias" is optional. Note that some setups require the alias to match the username to work properly)
21. On line 5, replace 'YOUR_PASSWORD' with the password of the account you used on line 3.
22. On line 6, replace 'chatroom@conference.XmppServerName' with the JID of the room you want this to listen on.
23. On line 7, replace 'XmppServerName' with server name;
24. On line 8, replace 5222 with port number of server;
25. Save your changes
26. Open your command line and browse to the folder
27. Type the command "node app.js" and press enter. If you get an error about "command not found" try using "nodejs app.js" instead.
28. If its working, you will see three messages appear in your console:
> "Successfully authenticated with your_JID"
> "Successfully connected to XMPP chatroom"
> "Successfully connected to Discord"

You can also use discord-xmpp.service to install and run the process as a systemd service.
