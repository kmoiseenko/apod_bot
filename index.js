// Modules
// ------------------------------------------------------------
let TelegramBot = require('node-telegram-bot-api');
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let jsonfile = require('jsonfile');


// Variables
// ------------------------------------------------------------
const API_LINK = 'https://api.nasa.gov/planetary/apod?api_key=rom93FHJOFb6TF4jSC7USdH03jogPMtfg7qDHrMd';
const BOT_TOKEN = '508617689:AAEuLPKs-EhrjrYGnz60inYNZqakf6HJWc0';
const BOT = new TelegramBot(BOT_TOKEN, {polling: true});
const DELAY = 21600000; // 6 hours
// const DELAY = 60000; // 1 minute
let usersData = 'users_data.json';
let hours = 'hours.json';


onInit();


// Bot response
// ------------------------------------------------------------
BOT.onText(/\/pic/, (msg, match) => {
	checkOutWithUsersFile(msg.from);
	sendResponse(msg.from.id, 'pic');
});

BOT.onText(/\/desc/, (msg, match) => {
	checkOutWithUsersFile(msg.from);
	sendResponse(msg.from.id, 'desc');
});

BOT.onText(/\/all/, (msg, match) => {
	checkOutWithUsersFile(msg.from);
	sendResponse(msg.from.id, 'all');
});


// Functions
// ------------------------------------------------------------
function onInit() {
	jsonfile.readFile(hours, (err, obj) => {
		if(err) {
			console.log(err);
		} else {
			setInterval(() => {
				obj["hours"] === new Date().getHours() ? sendResponseToAllUsers() : console.log("Not yet");
			}, DELAY);
		}
	});
}

function sendResponseToAllUsers() {
	jsonfile.readFile(usersData, (err, obj) => {
		if(err) {
			console.log(err);
		} else {
			for(let key in obj) {
				sendResponse(parseInt(key), 'all');
			}
		}
	});
}

function checkOutWithUsersFile(data) {
	jsonfile.readFile(usersData, (err, obj) => {
		if(err) {
			console.log(err);
		} else {
			for(let key in obj) {
				if(parseInt(key) != data.id) {
					addItemInUsersFile(data, obj);
				}
			}
		}
	});
}

function addItemInUsersFile(data, obj) {
	obj[data.id.toString()] = data.username;

	jsonfile.writeFile(usersData, obj, {spaces: 2, EOL: '\r\n'}, (err) => {
		err ? console.log(err) : null;
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