// Node modules
// ------------------------------------------------------------
let TelegramBot = require('node-telegram-bot-api');
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let jsonfile = require('jsonfile');
let CronJob = require('cron').CronJob;


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


// Bot response
// ------------------------------------------------------------
BOT.onText(COMM_SUBSCRIBE, (msg, match) => {
	// console.log(msg.from);
	updateUsersDataBase(msg.from, STR_SUBSCRIBE);
});

BOT.onText(COMM_UNSUBSCRIBE, (msg, match) => {
	// console.log(msg.from);
	updateUsersDataBase(msg.from, STR_UNSUBSCRIBE);
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
		console.log('Make request to NASA api to save response in apod.json');
		updateApodData();
	}, null, true, 'Europe/Kiev');
	console.log('job status', job.running);
}

function updateApodData() {
	getData(API_LINK).then(
		response => {
			jsonfile.writeFile(APOD, JSON.parse(response), {spaces: 2, EOL: '\r\n'}, (err) => {
				if(err){
					console.log(err);
				} else {
					console.log("apod.json file was updated. Now it is time to send updated information to all users");
					sendResponseToAllUsers();
				}
			});
		},
		error => console.log(error)
	);
}

function sendResponseToAllUsers() {
	jsonfile.readFile(USERS_DATA, (err, usersObj) => {
		if(err) {
			console.log(err);
		} else {
			for(let key in usersObj) {
				sendResponse(parseInt(key), STR_ALL);
			}
		}
	});
}

function updateUsersDataBase(telegramData, command) {
	let match = false;

	jsonfile.readFile(USERS_DATA, (err, usersObj) => {
		if(err) {
			console.log(err);
		} else {
			for(let key in usersObj) {
				if(parseInt(key) === telegramData.id) {
					match = true;
					break;
				}
			}
		}

		switch(command) {
			case STR_SUBSCRIBE:
				match ? BOT.sendMessage(telegramData.id, MSG_SUBSCRIBE_ALREADY) : addUserInDataBase(telegramData, usersObj);
				break;

			case STR_UNSUBSCRIBE:
				match ? removeUserFromDataBase(telegramData, usersObj) : BOT.sendMessage(telegramData.id, 'Эта команда вам недоступна');
				break;
		}
	});
}

function addUserInDataBase(telegramData, usersObj) {
	usersObj[telegramData.id.toString()] = telegramData.first_name;

	jsonfile.writeFile(USERS_DATA, usersObj, {spaces: 2, EOL: '\r\n'}, (err) => {
		if(err){
			console.log(err);
		} else {
			console.log("User " + telegramData.first_name + " was added in database");
			BOT.sendMessage(telegramData.id, MSG_SUBSCRIBE_SUCCESS);
		}
	});
}

function removeUserFromDataBase(telegramData, usersObj) {
	delete usersObj[telegramData.id.toString()];

	jsonfile.writeFile(USERS_DATA, usersObj, {spaces: 2, EOL: '\r\n'}, (err) => {
		if(err){
			console.log(err);
		} else {
			console.log("User " + telegramData.first_name + " was removed from database");
			BOT.sendMessage(telegramData.id, MSG_UNSUBSCRIBE_SUCCESS);
		}
	});	
}

function sendResponse(telegramUserId, command) {
	jsonfile.readFile(APOD, (err, apodObj) => {
		let desc = '<b>' + apodObj.title + '</b>' + '\n' + apodObj.explanation;

		switch(command) {
			case STR_PIC:
				BOT.sendPhoto(telegramUserId, apodObj.url);
				break;

			case STR_DESC:
				BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
				break;

			case STR_ALL:
				BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
				BOT.sendPhoto(telegramUserId, apodObj.url);
				break;
		}
	});
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