// Node modules
// ------------------------------------------------------------
let TelegramBot = require('node-telegram-bot-api');
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let jsonfile = require('jsonfile');
let CronJob = require('cron').CronJob;


// Variables
// ------------------------------------------------------------
const API_LINK = 'https://api.nasa.gov/planetary/apod?api_key=rom93FHJOFb6TF4jSC7USdH03jogPMtfg7qDHrMd';
const BOT_TOKEN = '508617689:AAEuLPKs-EhrjrYGnz60inYNZqakf6HJWc0';
const BOT = new TelegramBot(BOT_TOKEN, {polling: true});
const USERS_DATA = 'users.json';


// Messages
// ------------------------------------------------------------
const SUBSCRIBE_SUCCESS = 'You are successfully subscribed. This bot will send you a new article every day at 14-00';
const SUBSCRIBE_ALREADY = 'You are already subscribed. Expect a new article every day at 14-00';


onInit();


// Bot response
// ------------------------------------------------------------
BOT.onText(/\/subscribe/, (msg, match) => {
	console.log(msg.from);
	checkOutWithUsersDataBase(msg.from);
});

BOT.onText(/\/pic/, (msg, match) => {
	console.log(msg.from);
	sendResponse(msg.from.id, 'pic');
});

BOT.onText(/\/desc/, (msg, match) => {
	console.log(msg.from);
	sendResponse(msg.from.id, 'desc');
});

BOT.onText(/\/all/, (msg, match) => {
	console.log(msg.from);
	sendResponse(msg.from.id, 'all');
});


// Functions
// ------------------------------------------------------------
function onInit() {
	let job = new CronJob('00 00 14 * * *', function() {
		console.log('Send all users an update at 14-00-00');
		sendResponseToAllUsers();
	}, null, true, 'Europe/Kiev');
	console.log('job status', job.running);
}

function sendResponseToAllUsers() {
	jsonfile.readFile(USERS_DATA, (err, obj) => {
		if(err) {
			console.log(err);
		} else {
			for(let key in obj) {
				sendResponse(parseInt(key), 'all');
			}
		}
	});
}

function checkOutWithUsersDataBase(data) {
	let match = false;

	jsonfile.readFile(USERS_DATA, (err, obj) => {
		if(err) {
			console.log(err);
		} else {
			for(let key in obj) {
				if(parseInt(key) === data.id) {
					match = true;
					break;
				}
			}
		}

		!match ? addItemInUsersFile(data, obj) : BOT.sendMessage(data.id, SUBSCRIBE_ALREADY);
	});
}

function addItemInUsersFile(data, obj) {
	obj[data.id.toString()] = data.first_name;

	jsonfile.writeFile(USERS_DATA, obj, {spaces: 2, EOL: '\r\n'}, (err) => {
		if(err){
			console.log(err);
		} else {
			console.log("User " + data.first_name + " was added in database");
			BOT.sendMessage(data.id, SUBSCRIBE_SUCCESS);
		}
	});
}

function sendResponse(userId, type) {
	getData(API_LINK).then(
		response => {
			let parseResponse = JSON.parse(response);
			let desc = '<b>' + parseResponse.title + '</b>' + '\n' + parseResponse.explanation;

			switch(type) {
				case 'pic':
					BOT.sendPhoto(userId, parseResponse.url);
					break;

				case 'desc':
					BOT.sendMessage(userId, desc, {parse_mode: 'HTML'});
					break;

				case 'all':
					BOT.sendPhoto(userId, parseResponse.url);
					BOT.sendMessage(userId, desc, {parse_mode: 'HTML'});
					break;
			}
		},
		error => console.log(error)
	);
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