// Node modules
// ------------------------------------------------------------
let TelegramBot = require('node-telegram-bot-api');
let CronJob = require('cron').CronJob;
let MongoClient = require('mongodb').MongoClient;
let download = require('image-downloader');


// Modules
// ------------------------------------------------------------
let Utils = require('./code/utils.js');


// Variables
// ------------------------------------------------------------
const NASA_API = 'https://api.nasa.gov/planetary/apod?api_key=rom93FHJOFb6TF4jSC7USdH03jogPMtfg7qDHrMd';
const BOT_TOKEN = '508617689:AAEuLPKs-EhrjrYGnz60inYNZqakf6HJWc0';
const BOT = new TelegramBot(BOT_TOKEN, {polling: true});


// Messages
// ------------------------------------------------------------
const MSG_SUBSCRIBE_SUCCESS = 'You are successfully subscribed. This bot will send you a new article every day at 14:00';
const MSG_UNSUBSCRIBE_SUCCESS = 'You are successfully unsubscribed. You will not receive updates anymore';
const MSG_SUBSCRIBE_ALREADY = 'You are already subscribed. Expect a new article every day at 14:00';


// Commands
// ------------------------------------------------------------
const STR_SUBSCRIBE = 'subscribe';
const STR_UNSUBSCRIBE = 'unsubscribe';
const STR_PIC = 'pic';
const STR_DESC = 'desc';
const STR_ALL = 'all';

const COMM_SUBSCRIBE = new RegExp('\\/' + STR_SUBSCRIBE);
const COMM_UNSUBSCRIBE = new RegExp('\\/' + STR_UNSUBSCRIBE);
const COMM_PIC = new RegExp('\\/' + STR_PIC);
const COMM_DESC = new RegExp('\\/' + STR_DESC);
const COMM_ALL = new RegExp('\\/' + STR_ALL);


onInit();
getApod();

// Bot response
// ------------------------------------------------------------
BOT.onText(COMM_SUBSCRIBE, (msg, match) => {
	// console.log(msg.from);
	checkoutWithUsersCollection(msg.from, STR_SUBSCRIBE);
});

BOT.onText(COMM_UNSUBSCRIBE, (msg, match) => {
	// console.log(msg.from);
	checkoutWithUsersCollection(msg.from, STR_UNSUBSCRIBE);
});

BOT.onText(COMM_PIC, (msg, match) => {
	// console.log(msg.from);
	sendResponse(msg.from.id, STR_PIC);
});

BOT.onText(COMM_DESC, (msg, match) => {
	// console.log(msg.from);
	sendResponse(msg.from.id, STR_DESC);
});

BOT.onText(COMM_ALL, (msg, match) => {
	// console.log(msg.from);
	sendResponse(msg.from.id, STR_ALL);
});


// Functions
// ------------------------------------------------------------
function onInit() {
	let job = new CronJob('00 00 14 * * *', function() {
		console.log(Utils.getCurrentTime() + ' - ' + 'Make request to NASA api to save response in apod.json');
		getApod();
	}, null, true, 'Europe/Kiev');
	console.log('job status', job.running);
}

function getApod() {
	Utils.getData(NASA_API).then(
		response => {
			let parsedResponse = JSON.parse(response);

			if(Utils.checkExtention(parsedResponse.url) === false) {
				let imgDest = './data/db/img.jpeg';
				
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
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(Utils.getCurrentTime() + ' - ' + err); }

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
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(Utils.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').find().forEach(user => {
			client.close();
			sendResponse(user.id, STR_ALL);
			console.log(Utils.getCurrentTime() + ' - ' + 'New APOD was send to user ' + user.first_name);
		});
	});
}

function checkoutWithUsersCollection(telegramData, command) {
	let match = false;

	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(Utils.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').findOne({ id: telegramData.id }).then(result => {
			if(result) {
				match = true;
			}

			switch(command) {
				case STR_SUBSCRIBE:
					match ? BOT.sendMessage(telegramData.id, MSG_SUBSCRIBE_ALREADY) : addUserInCollection(telegramData);
					break;

				case STR_UNSUBSCRIBE:
					match ? removeUserFromCollection(telegramData) : BOT.sendMessage(telegramData.id, 'Эта команда вам недоступна');
					break;
			}

			client.close();
		});
	});
}

function addUserInCollection(telegramData) {
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(Utils.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').insertOne(telegramData).then(result => {
			if(result) {
				console.log(Utils.getCurrentTime() + ' - ' + "User " + telegramData.first_name + " was added in database");
				BOT.sendMessage(telegramData.id, MSG_SUBSCRIBE_SUCCESS);
				client.close();
			}
		});
	});
}

function removeUserFromCollection(telegramData) {
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(Utils.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').deleteOne({ id: telegramData.id }).then(result => {
			if(result) {
				console.log(Utils.getCurrentTime() + ' - ' + "User " + telegramData.first_name + " was removed from database");
				BOT.sendMessage(telegramData.id, MSG_UNSUBSCRIBE_SUCCESS);
				client.close();
			}
		});
	});
}

function sendResponse(telegramUserId, command) {
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(Utils.getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');

		db.collection('apod').findOne().then(result => {
			let desc = '<b>' + result.title + '</b>' + '\n' + result.explanation;

			switch(command) {
				case STR_PIC:
					BOT.sendPhoto(telegramUserId, result.url);
					break;

				case STR_DESC:
					BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
					break;

				case STR_ALL:
					BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
					BOT.sendPhoto(telegramUserId, result.url);
					break;
			}

			client.close();
		});
	});
}