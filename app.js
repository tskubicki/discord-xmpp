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
const IN_CHANNEL_BOT_NAME = 'Mr. Discord';

//Debugging options
const DEBUG = false; //turn on the debug log. Useful to troubleshoot issues.
const LOG_FILE = './debug.log'; //where the log file will be saved to. Same folder this file lives in by default
var xmppKeepAlivesSent = 0; //Keep track of XMPP keepAlives sent since the last message
var fs = null;

//Make libraries available
var Discord = require("discord.js"),
	XMPP = require('node-xmpp-client'),
	TinyURL = require ('tinyurl');

//Initialize Debug logging if enabled
if (DEBUG){
	fs = require('fs');
	fs.access(LOG_FILE, function(err){
		if (err){
			console.log('\n' + formatLogEntry('No log file found at ' + LOG_FILE + '. Making a new one.'));
			addLog('New log started');
		}
		addLog('Bot started');
	});
}

//initialize node-xmpp-client
var xmpp = new XMPP({
	jid: JID,
	password: PASSWORD,
	preferredSaslMechanism: 'PLAIN',
	preferred: 'PLAIN',
	reconnect: true,
	host: HOST,
	port: PORT
});

//initialize discord.js
var discord = new Discord.Client({autoReconnect: true});

//auth with the Discord API with the above token
discord.login(DISCORD_API_TOKEN);

//discord Channel object representing our chatroom
var channel = new Discord.TextChannel({
	id: DISCORD_CHATROOM_ID,
	client: "bot"
});

//Discord debug
if (DEBUG) discord.on('debug', function(msg){ addLog("[Discord] " + msg) })
				  .on('warn', function(msg){ addLog("[Discord] " + msg) });

//report that discord is connected
discord.on('ready', function(){
	discord.channel = discord.channels.get(DISCORD_CHATROOM_ID);
	console.log("Successfully connected to Discord.");
	if (DEBUG) addLog("[Discord] Successfully connected to Discord.");
});

//handle messages from discord server
discord.on("message", function(message) {
	//ignore messages from the bot itself, and any messages except those from this channel
	if (message.author.id === discord.user.id ||
		message.channel.id != DISCORD_CHATROOM_ID)
		return;

	var content = new String (message.content),
		isMe = false; //is this message using a '/me'

	if (DEBUG) {
		addLog('[Message - Discord to XMPP RAW Message] ' + message);
		xmppKeepAlivesSent = 0;
	}
	//handle messages with mentions
	if (message.mentions.users.array().length){
		message.mentions.users.array().forEach(function(mention){
			if (DEBUG) {
				addLog('[Discord to XMPP Mention replace] ' + mention.username);
				xmppKeepAlivesSent = 0;
			}
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

	if (message.attachments.array().length){
		message.attachments.array().forEach(function(attachment){
			xmpp.send(new XMPP.Stanza('message', { to: ROOM_JID, type: 'groupchat', id: RANDOM_ID })
				.c('body')
				.t((isMe ? '* ' : '[') +
					(message.member.nickname ? message.member.nickname : message.author.username) +
					(isMe ? ' ' : '] ') + content +
					(message.attachments.array().length ? "\n" : '') +
					attachment.url));
	        });
	}else{
		var message = (isMe ? '* ' : '[') +
					  (message.member.nickname ? message.member.nickname : message.author.username) +
					  (isMe ? ' ' : '] ') +	content;

		xmpp.send(new XMPP.Stanza('message', { to: ROOM_JID, type: 'groupchat', id: RANDOM_ID })
			.c('body')
			.t(message));
		if (DEBUG) {
			addLog('[Message - Discord to XMPP] ' + message);
			xmppKeepAlivesSent = 0;
		}
	}
})
discord.on("error", function(error) {
	console.log("\nSomething went wrong with Discord: \n");
	console.log(error);
	addLog('[Discord] ' + error);
});

//Login to XMPP server, and join the chatroom
xmpp.on('online', function() {
	console.log("Successfully connected to XMPP chatroom '" + ROOM_JID + '\'.');
	if (DEBUG) addLog("[XMPP] Successfully connected to XMPP chatroom '" + ROOM_JID);

	//let the world know we're online, and update our status accordingly
	xmpp.send(new XMPP.Stanza('presence', {type: 'available'}));

	//join the Multi-User Chatroom
	xmpp.send(new XMPP.Element('presence', {from: JID, to: ROOM_JID + '/' + IN_CHANNEL_BOT_NAME}));

	xmpp.send(new XMPP.Element('presence', {to: ROOM_JID +'/' + IN_CHANNEL_BOT_NAME})
	    .c('x', { xmlns: 'http://jabber.org/protocol/muc' }));
});

xmpp.on('auth', function(){
	console.log('Successfully authenticated with ' + JID);
	if (DEBUG) addLog('[XMPP] Successfully authenticated with ' + JID);
});

xmpp.on('stanza', function(stanza) {
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

		var bodyText = body.getText(),
			isMe = false,
			matches;
		if (matches = bodyText.match(/^\/[mM][eE] (.*)$/)) {
			bodyText = matches[1];
			isMe = true;
		}

		//craft and send message
		var sender = stanza.attrs.from.split('/')[1],
			message = '';
		if (isMe)
			message = '_\* **' + sender + '** ' + bodyText + '_';
		else
			message = '**`[' + sender + ']`** ' + bodyText;

		discord.channel.sendMessage(message);

		if (DEBUG){
			addLog('[Message - XMPP to Discord] ' + message);
			xmppKeepAlivesSent = 0;
		}
	}
});

xmpp.on('error', function(e) {
	console.log("\nSomething went wrong with XMPP:\n");
	console.log(e);
	if (DEBUG) addLog('[XMPP Error] ' + e);
});

//XMPP Server keep-alive
setInterval(function(){
	xmpp.send(' ');
	if (DEBUG) xmppKeepAlivesSent++;
}, 60000);

//XMPP Server keep-alive
setInterval(function(){
	xmpp.send(' ');

	if (DEBUG) addLog('[XMPP] ' + xmppKeepAlivesSent + ' keepAlives sent since the last message sent/received by XMPP');
	if (DEBUG) addLog('[XMPP] ' + ((xmpp.state == 5) ? 'Connection OK' : 'Problem with connection') + ' (State: ' + xmpp.state + ')');
}, 1800000); //every half hour

//on close, set XMPP status to offline and logout of discord
process.on('SIGINT', function(code) {
	console.log('\nShutting down...');
	if (DEBUG) addLog('Bot shutting down');
	xmpp.send(new XMPP.Stanza('presence', {from: JID, to: ROOM_JID, type: 'unavailable'}));
	discord.destroy();
	setTimeout(function() {
		process.exit()
	}, 1000);
});


//Debug helpers
function formatLogEntry(inputString){
	if (inputString.length) return '\n' + Date() + ': ' + inputString;
}

function addLog(inputString){
	if (fs){
		fs.appendFile(LOG_FILE, formatLogEntry(inputString), function(err){
			if (err) console.log(formatLogEntry('\nCouldn\'t write to the log file for some reason:\n' + err));
		});
	}
}
