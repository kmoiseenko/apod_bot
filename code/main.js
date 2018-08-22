// Node modules
// ------------------------------------------------------------
let MongoClient = require('mongodb').MongoClient;
let CronJob = require('cron').CronJob;
let download = require('image-downloader');
let TelegramBot = require('node-telegram-bot-api');

// Tools
// ------------------------------------------------------------
let TOOLS = require('./tools/tools.js');
let MSG = require('./tools/msg.js');
let COMD = require('./tools/commands.js');


// Variables
// ------------------------------------------------------------
const NASA_API = 'https://api.nasa.gov/planetary/apod?api_key=rom93FHJOFb6TF4jSC7USdH03jogPMtfg7qDHrMd';
const BOT_TOKEN = '508617689:AAEuLPKs-EhrjrYGnz60inYNZqakf6HJWc0';
const BOT = new TelegramBot(BOT_TOKEN, {polling: true});
const MONGO_DB = 'mongodb://localhost:27017';


// Bot response
// ------------------------------------------------------------
BOT.onText(COMD.comd_subscribe, (msg, match) => {
	checkoutWithUsersCollection(msg.from, COMD.str_subscribe);
});

BOT.onText(COMD.comd_unsubscribe, (msg, match) => {
	checkoutWithUsersCollection(msg.from, COMD.str_unsubscribe);
});

BOT.onText(COMD.comd_all, (msg, match) => {
	sendResponse(msg.from.id, COMD.str_all);
});

BOT.onText(COMD.comd_about, (msg, match) => {
	sendResponse(msg.from.id, COMD.str_about);
});

BOT.onText(COMD.comd_contact, (msg, match) => {
	sendResponse(msg.from.id, COMD.str_contact);
});

// Functions
// ------------------------------------------------------------
module.exports.onInit = function onInit() {
	let job = new CronJob('00 00 14 * * *', function() {
		console.log(TOOLS.getCurrentTime() + ' - ' + 'Make request to NASA api');
		getApod();
	}, null, true, 'Europe/Kiev');
	console.log('job status', job.running);
}

function getApod() {
	TOOLS.getData(NASA_API).then(
		response => {
			let parsedResponse = JSON.parse(response);
			let fileDest = './etc/file.' + TOOLS.checkExtention(parsedResponse.url);

			download.image({
				url: parsedResponse.url,
				dest: fileDest
			}).then(({ filename, image }) => {
				console.log('File saved to', filename);
				parsedResponse.url = fileDest;
				updateApodCollection(parsedResponse);
			}).catch((err) => {
				console.log(err);
			});
		},
		error => console.log(error)
	);
}

function updateApodCollection(response) {
	TOOLS.connectToDB()
	.then(client => {
		let db = client.db('admin');
		let currentApod = db.collection('apod').findOne().then(result => {
			return result;
		});

		db.collection('apod').replaceOne(
			currentApod,
			response
		).then(result => {
			if(result) {
				sendResponseToAllUsers();
			}
		})
		.catch(reject => {
			console.log(reject);
		});

		client.close();
	})
	.catch(reject => {
		console.log(reject);
		client.close();
	});
}

function sendResponseToAllUsers() {
	TOOLS.connectToDB()
	.then(client => {
		let db = client.db('admin');

		db.collection('users').find().forEach(user => {
			sendResponse(user.id, COMD.str_all);
			console.log(TOOLS.getCurrentTime() + ' - ' + 'New APOD was send to user ' + user.first_name);
		});

		client.close();
	})
	.catch(reject => {
		console.log(reject);
		client.close();
	});
}

function checkoutWithUsersCollection(telegramData, command) {
	let match = false;

	TOOLS.connectToDB()
	.then(client => {
		let db = client.db('admin');

		db.collection('users').findOne({ id: telegramData.id })
		.then(result => {
			if(result) {
				match = true;
			}

			switch(command) {
				case COMD.str_subscribe:
					match ? BOT.sendMessage(telegramData.id, MSG.SUBSCRIBE_ALREADY) : addUserInCollection(telegramData);
					break;

				case COMD.str_unsubscribe:
					match ? removeUserFromCollection(telegramData) : BOT.sendMessage(telegramData.id, MSG.UNAVALIABLE);
					break;
			}
		})
		.catch(reject => {
			console.log(reject);
		});

		client.close();
	})
	.catch(reject => {
		console.log(reject);
		client.close();
	});
}

function addUserInCollection(telegramData) {
	TOOLS.connectToDB()
	.then(client => {
		let db = client.db('admin');

		db.collection('users').insertOne(telegramData)
		.then(result => {
			if(result) {
				console.log(TOOLS.getCurrentTime() + ' - ' + "User " + telegramData.first_name + " was added in database");
				BOT.sendMessage(telegramData.id, MSG.SUBSCRIBE_SUCCESS);
			}
		})
		.catch(reject => {
			console.log(reject);
		});

		client.close();
	})
	.catch(reject => {
		console.log(reject);
		client.close();
	});
}

function removeUserFromCollection(telegramData) {
	TOOLS.connectToDB()
	.then(client => {
		let db = client.db('admin');

		db.collection('users').deleteOne({ id: telegramData.id })
		.then(result => {
			if(result) {
				console.log(TOOLS.getCurrentTime() + ' - ' + "User " + telegramData.first_name + " was removed from database");
				BOT.sendMessage(telegramData.id, MSG.UNSUBSCRIBE_SUCCESS);
			}
		})
		.catch(reject => {
			console.log(reject);
		});

		client.close();
	})
	.catch(reject => {
		console.log(reject);
		client.close();
	});
}

function sendResponse(telegramUserId, command) {
	TOOLS.connectToDB()
	.then(resolve => {
		let db = client.db('admin');

		db.collection('apod').findOne()
		.then(result => {
			let desc = '<b>' + result.title + '</b>' + '\n' + result.explanation;
			let about = MSG.ABOUT;
			let contact = MSG.CONTACT;

			switch(command) {
				case COMD.str_all:
					BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
					BOT.sendPhoto(telegramUserId, result.url);
					break;

				case COMD.str_about:
					BOT.sendMessage(telegramUserId, about, {parse_mode: 'HTML'});
					break;

				case COMD.str_contact:
					BOT.sendMessage(telegramUserId, contact, {parse_mode: 'HTML'});
					break;
			}
		})
		.catch(reject => {
			console.log(reject);
		});

		client.close();
	})
	.catch(reject => {
		console.log(reject);
		client.close();
	});
}
