// Node modules
// ------------------------------------------------------------
let MongoClient = require('mongodb').MongoClient;
let CronJob = require('cron').CronJob;
let download = require('image-downloader');
let TelegramBot = require('node-telegram-bot-api');


// Tools
// ------------------------------------------------------------
let UTILS = require('./tools/tools.js');
let MSG = require('./tools/msg.js');
let COMM = require('./tools/commands.js');


// Variables
// ------------------------------------------------------------
const NASA_API = 'https://api.nasa.gov/planetary/apod?api_key=rom93FHJOFb6TF4jSC7USdH03jogPMtfg7qDHrMd';
const BOT_TOKEN = '508617689:AAEuLPKs-EhrjrYGnz60inYNZqakf6HJWc0';
const BOT = new TelegramBot(BOT_TOKEN, {polling: true});
const MONGO_DB = 'mongodb://localhost:27017';


// Bot response
// ------------------------------------------------------------
BOT.onText(COMM.comm_subscribe, (msg, match) => {
	checkoutWithUsersCollection(msg.from, COMM.str_subscribe);
});

BOT.onText(COMM.comm_unsubscribe, (msg, match) => {
	checkoutWithUsersCollection(msg.from, COMM.str_unsubscribe);
});

BOT.onText(COMM.comm_pic, (msg, match) => {
	sendResponse(msg.from.id, COMM.str_pic);
});

BOT.onText(COMM.comm_desc, (msg, match) => {
	sendResponse(msg.from.id, COMM.str_desc);
});

BOT.onText(COMM.comm_all, (msg, match) => {
	sendResponse(msg.from.id, COMM.str_all);
});


// Functions
// ------------------------------------------------------------
module.exports.onInit = function onInit() {
	let job = new CronJob('00 00 14 * * *', function() {
		console.log(UTILS.getCurrentTime() + ' - ' + 'Make request to NASA api');
		getApod();
	}, null, true, 'Europe/Kiev');
	console.log('job status', job.running);
}

function getApod() {
	UTILS.getData(NASA_API).then(
		response => {
			let parsedResponse = JSON.parse(response);

			if(UTILS.checkExtention(parsedResponse.url) === false) {
				let imgDest = './etc/img.jpeg';
				
				download.image({
					url: parsedResponse.url,
					dest: imgDest
				}).then(({ filename, image }) => {
					console.log('File saved to', filename);
					parsedResponse.url = imgDest;
					updateApodCollection(parsedResponse);
				}).catch((err) => {
					console.log(err);
				});
			} else {
				updateApodCollection(parsedResponse);
			}
		},
		error => console.log(error)
	);
}

function updateApodCollection(response) {
	MongoClient.connect(MONGO_DB, (err, client) => {
		if(err) { return console.log(UTILS.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		let currentApod = db.collection('apod').findOne().then(result => {
			return result;
		});
		
		db.collection('apod').replaceOne(
			currentApod,
			response
		).then(result => {
			if(result) {
				client.close();
				sendResponseToAllUsers();
			}
		});
	});
}

function sendResponseToAllUsers() {
	MongoClient.connect(MONGO_DB, (err, client) => {
		if(err) { return console.log(UTILS.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').find().forEach(user => {
			client.close();
			sendResponse(user.id, COMM.str_all);
			console.log(UTILS.getCurrentTime() + ' - ' + 'New APOD was send to user ' + user.first_name);
		});
	});
}

function checkoutWithUsersCollection(telegramData, command) {
	let match = false;

	MongoClient.connect(MONGO_DB, (err, client) => {
		if(err) { return console.log(UTILS.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').findOne({ id: telegramData.id }).then(result => {
			if(result) {
				match = true;
			}

			switch(command) {
				case COMM.str_subscribe:
					match ? BOT.sendMessage(telegramData.id, MSG.SUBSCRIBE_ALREADY) : addUserInCollection(telegramData);
					break;

				case COMM.str_unsubscribe:
					match ? removeUserFromCollection(telegramData) : BOT.sendMessage(telegramData.id, MSG.UNAVALIABLE);
					break;
			}

			client.close();
		});
	});
}

function addUserInCollection(telegramData) {
	MongoClient.connect(MONGO_DB, (err, client) => {
		if(err) { return console.log(UTILS.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').insertOne(telegramData).then(result => {
			if(result) {
				console.log(UTILS.getCurrentTime() + ' - ' + "User " + telegramData.first_name + " was added in database");
				BOT.sendMessage(telegramData.id, MSG.SUBSCRIBE_SUCCESS);
				client.close();
			}
		});
	});
}

function removeUserFromCollection(telegramData) {
	MongoClient.connect(MONGO_DB, (err, client) => {
		if(err) { return console.log(UTILS.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').deleteOne({ id: telegramData.id }).then(result => {
			if(result) {
				console.log(UTILS.getCurrentTime() + ' - ' + "User " + telegramData.first_name + " was removed from database");
				BOT.sendMessage(telegramData.id, MSG.UNSUBSCRIBE_SUCCESS);
				client.close();
			}
		});
	});
}

function sendResponse(telegramUserId, command) {
	MongoClient.connect(MONGO_DB, (err, client) => {
		if(err) { return console.log(UTILS.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');

		db.collection('apod').findOne().then(result => {
			let desc = '<b>' + result.title + '</b>' + '\n' + result.explanation;

			switch(command) {
				case COMM.str_pic:
					BOT.sendPhoto(telegramUserId, result.url);
					break;

				case COMM.str_desc:
					BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
					break;

				case COMM.str_all:
					BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
					BOT.sendPhoto(telegramUserId, result.url);
					break;
			}

			client.close();
		});
	});
}