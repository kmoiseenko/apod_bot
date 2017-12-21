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
const SUBSCRIBE_SUCCESS = 'You are successfully subscribed. This bot will send you a new article every day at 14-00';
const SUBSCRIBE_ALREADY = 'You are already subscribed. Expect a new article every day at 14-00';


onInit();


// Bot response
// ------------------------------------------------------------
BOT.onText(/\/subscribe/, (msg, match) => {
	// console.log(msg.from);
	checkOutWithUsersDataBase(msg.from);
});

BOT.onText(/\/pic/, (msg, match) => {
	// console.log(msg.from);
	sendResponse(msg.from.id, 'pic');
});

BOT.onText(/\/desc/, (msg, match) => {
	// console.log(msg.from);
	sendResponse(msg.from.id, 'desc');
});

BOT.onText(/\/all/, (msg, match) => {
	// console.log(msg.from);
	sendResponse(msg.from.id, 'all');
});


// Functions
// ------------------------------------------------------------
function onInit() {
	let job = new CronJob('00 00 14 * * *', function() {
		console.log('Make request to NASA api, and write response in apod.json');
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
					console.log("apod.json file was updated. Now we can send updated information to all users");
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
				sendResponse(parseInt(key), 'all');
			}
		}
	});
}

function checkOutWithUsersDataBase(telegramData) {
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

		!match ? addItemInUsersDataBase(telegramData, usersObj) : BOT.sendMessage(telegramData.id, SUBSCRIBE_ALREADY);
	});
}

function addItemInUsersDataBase(telegramData, usersObj) {
	usersObj[telegramData.id.toString()] = telegramData.first_name;

	jsonfile.writeFile(USERS_DATA, usersObj, {spaces: 2, EOL: '\r\n'}, (err) => {
		if(err){
			console.log(err);
		} else {
			console.log("User " + telegramData.first_name + " was added in database");
			BOT.sendMessage(telegramData.id, SUBSCRIBE_SUCCESS);
		}
	});
}

function sendResponse(telegramUserId, command) {
	jsonfile.readFile(APOD, (err, apodObj) => {
		let desc = '<b>' + apodObj.title + '</b>' + '\n' + apodObj.explanation;

		switch(command) {
			case 'pic':
				BOT.sendPhoto(telegramUserId, apodObj.url);
				break;

			case 'desc':
				BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
				break;

			case 'all':
				BOT.sendPhoto(telegramUserId, apodObj.url);
				BOT.sendMessage(telegramUserId, desc, {parse_mode: 'HTML'});
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