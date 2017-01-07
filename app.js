#!/usr/bin/env node
const DISCORD_API_TOKEN = 'YOUR_DISCORD_API_TOKEN';
const DISCORD_CHATROOM_ID = 'YOUR_DISCORD_CHATROOM_ID';
const JID = 'username@XmppServerName/username';
const PASSWORD = 'YOUR_PASSWORD';
const ROOM_JID = 'chatroom@conference.XmppServerName';
const HOST = 'XmppServerName';
const PORT = 5222;

//Random XMPP ID string ; some setups need this
const RANDOM_ID = Math.random().toString(36).substring(2,10);

//The name this bot will use in your XMPP Chatroom. 
//You can change this to whatever you want
const IN_CHANNEL_BOT_NAME = '[DISCORD]'; 

//Make libraries available
var Discord = require("discord.js");
var XMPP = require('node-xmpp-client');
var TinyURL = require ('tinyurl');

//initialize node-xmpp-client
var client = new XMPP({
	jid: JID,
	password: PASSWORD,
	preferredSaslMechanism: 'PLAIN',
	preferred: 'PLAIN',
	reconnect: true,
	host: HOST,
	port: PORT
});

//initialize discord.js
var discord = new Discord.Client({autoreconnect: true});

//auth with the Discord API with the above token
discord.loginWithToken(DISCORD_API_TOKEN);

//report that discord is connected
discord.on('ready', function(){
	console.log("Successfully connected to Discord.");
});

//report that XMPP is connected, and other things
client.on('online', function() {
	console.log("Successfully connected to XMPP chatroom '" + ROOM_JID + '\'.');

	//let the world know we're online, and update our status accordingly
	client.send(new XMPP.Stanza('presence', {type: 'available'}));

	//join the Multi-User Chatroom
	client.send(new XMPP.Element('presence', {from: JID, to: ROOM_JID + '/' + IN_CHANNEL_BOT_NAME}));
});

//discord channel object representing our chatroom
var channel = new Discord.Channel({
	id: DISCORD_CHATROOM_ID,
	client: "bot"
});

//handle messages from discord server
discord.on("message", function(message) {
	//ignore messages from the bot itself, and any messages except those from this channel
	if (message.author.id === discord.user.id || 
		message.channel.id != DISCORD_CHATROOM_ID)
		return;

	var content = new String (message.content);
	var isMe = false; //is this message using a '/me'

  //handle messages with mentions
  if (message.mentions.length){
  	message.mentions.forEach(function(mention){
  		content = content.replace(
  			new RegExp('<@(!|)' + mention.id + '>', 'g'),
  			'@' + mention.username
  			);
  	});		
  }

	//handle Discord '/me' command -- its represented by an underscore at the start and end of the content
	if (message.content[0] == '_' && message.content[message.content.length - 1] == '_'){		
		isMe = true;
		content = content.substr(1, content.length-2);	   
	}
	
	if (message.attachments.length){
		TinyURL.shorten(message.attachments[0].url,function(res){
			client.send(new XMPP.Stanza('message', { to: ROOM_JID, type: 'groupchat', id: RANDOM_ID })
				.c('body')
				.t(message.author.username + 
					(isMe ? ' ' : ': ') +
					(message.attachments.length ? res + ' ' : '') + 
					content));
		});
	}else{
		client.send(new XMPP.Stanza('message', { to: ROOM_JID, type: 'groupchat', id: RANDOM_ID })
			.c('body')
			.t((isMe ? '* ' : '[') + message.author.username + 
				(isMe ? ' ' : '] ') +		  
				content));
	}

});

client.on('stanza', function(stanza) {
	//@TODO ignore all history -- kinda dirty, but XMPP keeps throwing chat history stanzas despite telling it otherwise
	//or I'm a n00b, likely the latter
	var isHistory = false;
	stanza.children.forEach(function(element){
		if (element.name === 'delay')//if the name of any child element is 'delay', the stanza is chat history
			isHistory = true;
	});
	if (isHistory) return;

	// ignore everything that isn't from the chatroom, or came from the bot itself
	if (stanza.is('message') &&	stanza.attrs.type === 'groupchat' && stanza.attrs.from !== ROOM_JID + '/' + IN_CHANNEL_BOT_NAME){

		var body = stanza.getChild('body');

		//stanzas with empty bodys are topic changes, and are ignored
		if (!body) return;

		var bodyText = body.getText();
		var isMe = false;
		var matches;
		if (matches = bodyText.match(/^\/[mM][eE] (.*)$/)) {
			bodyText = matches[1];
			isMe = true;
		}

		//craft and send message 
		var sender = stanza.attrs.from.split('/')[1];
		if (isMe) 
			var message = '_\* **' + sender + '** ' + bodyText + '_';
		else
			var message = '**`[' + sender + ']`** ' + bodyText;
		discord.sendMessage(channel, message); 
	}
});

client.on('error', function(e) {
	console.log("Something went wrong: ");
	console.log(e);
});

//XMPP Server keep-alive
setInterval(function(){
	client.send(' ');
}, 30000);


//on close, set XMPP status to offline and logout of discord
process.on('SIGINT', function(code) {
	console.log('shutting down')
	var stanza = new XMPP.Stanza('presence', {from: JID, to: ROOM_JID, type: 'unavailable'})
	client.send(stanza)

	discord.logout();

	setTimeout(function() {
		process.exit()
	}, 1000);
});
