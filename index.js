// Node modules
// ------------------------------------------------------------
let TelegramBot = require('node-telegram-bot-api');
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let jsonfile = require('jsonfile');
let CronJob = require('cron').CronJob;
let moment = require('moment');
let MongoClient = require('mongodb').MongoClient;


// Files
// ------------------------------------------------------------
const USERS_DATA = './json/users.json';
const APOD = './json/apod.json';


// Variables
// ------------------------------------------------------------
const API_LINK = 'https://api.nasa.gov/planetary/apod?api_key=rom93FHJOFb6TF4jSC7USdH03jogPMtfg7qDHrMd';
const BOT_TOKEN = '508617689:AAEuLPKs-EhrjrYGnz60inYNZqakf6HJWc0';
const BOT = new TelegramBot(BOT_TOKEN, {polling: true});


// Messages
// ------------------------------------------------------------
const MSG_SUBSCRIBE_SUCCESS = 'You are successfully subscribed. This bot will send you a new article every day at 14-00';
const MSG_UNSUBSCRIBE_SUCCESS = 'You are successfully unsubscribed. You will not receive updates anymore';
const MSG_SUBSCRIBE_ALREADY = 'You are already subscribed. Expect a new article every day at 14-00';


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
// sendResponseToAllUsers();

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
	console.log(msg);
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
		console.log(getCurrentTime() + ' - ' + 'Make request to NASA api to save response in apod.json');
		updateApodCollection();
	}, null, true, 'Europe/Kiev');
	console.log('job status', job.running);
}

function updateApodCollection() {
	getData(API_LINK).then(
		response => {
			MongoClient.connect("mongodb://localhost:27017", (err, client) => {
				if(err) { return console.log(getCurrentTime() + ' - ' + err); }

				let db = client.db('admin');
				let currentApod = db.collection('apod').findOne().then(result => {
					return result;
				});

				db.collection('apod').replaceOne(
					currentApod,
					JSON.parse(response)
				).then(result => {
					if(result) {
						client.close();
						sendResponseToAllUsers();
					}
				});
			});
		},
		error => console.log(error)
	);
}

function sendResponseToAllUsers() {
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').find().forEach(user => {
			client.close();
			sendResponse(user.id, STR_ALL);
			console.log(getCurrentTime() + ' - ' + 'New APOD was send to all users');
		});
	});
}

function checkoutWithUsersCollection(telegramData, command) {
	let match = false;

	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').findOne({ id: telegramData.id }).then(result => {
			if(result) {
				match = true;
			}

			switch(command) {
				case STR_SUBSCRIBE:
					match ? BOT.sendMessage(telegramData.id, MSG_SUBSCRIBE_ALREADY) : addUserInDataBase(telegramData);
					break;

				case STR_UNSUBSCRIBE:
					match ? removeUserFromDataBase(telegramData) : BOT.sendMessage(telegramData.id, 'Эта команда вам недоступна');
					break;
			}

			client.close();
		});
	});
}

function addUserInDataBase(telegramData) {
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').insertOne(telegramData).then(result => {
			if(result) {
				console.log(getCurrentTime() + ' - ' + "User " + telegramData.first_name + " was added in database");
				BOT.sendMessage(telegramData.id, MSG_SUBSCRIBE_SUCCESS);
				client.close();
			}
		});
	});
}

function removeUserFromDataBase(telegramData) {
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');
		
		db.collection('users').deleteOne(telegramData).then(result => {
			if(result) {
				console.log(getCurrentTime() + ' - ' + "User " + telegramData.first_name + " was removed from database");
				BOT.sendMessage(telegramData.id, MSG_UNSUBSCRIBE_SUCCESS);
				client.close();
			}
		});
	});
}

function sendResponse(telegramUserId, command) {
	MongoClient.connect("mongodb://localhost:27017", (err, client) => {
		if(err) { return console.log(getCurrentTime() + ' - ' + err); }

		let db = client.db('admin');

		db.collection('apod').findOne().then(result => {
			let desc = '<b>' + result.title + '</b>' + '\n' + result.explanation;

			switch(command) {
				case STR_PIC:
					checkExtention(result.url) ? BOT.sendPhoto(telegramUserId, result.url) : BOT.sendMessage(telegramUserId, result.url);
					break;

				case STR_DESC:
					BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
					break;

				case STR_ALL:
					BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
					checkExtention(result.url) ? BOT.sendPhoto(telegramUserId, result.url) : BOT.sendMessage(telegramUserId, result.url);
					break;
			}

			client.close();
		});
	});
}

function checkExtention(url) {
	let extention =  url.split('.').pop();
	let result = false;

	if(extention === 'jpeg' || extention === 'png') {
		result = true;
	}

	return result;
}

function getCurrentTime() {
	return moment().format("MM-DD-YYYY HH:mm");
}

function getData(url) {
    return new Promise(function(resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onload = function() {
            if (this.status == 200) {
                resolve(this.responseText);
            } else {
                let error = new Error(this.statusText);
                error.code = this.status;
                reject(error);
            }
        };

        xhr.onerror = function() {
            reject(new Error("Network Error"));
        };

        xhr.send();
    });
}