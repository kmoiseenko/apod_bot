// Modules
// ------------------------------------------------------------
let TelegramBot = require('node-telegram-bot-api');
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;


// Variables
// ------------------------------------------------------------
const API_LINK = 'https://api.nasa.gov/planetary/apod?api_key=rom93FHJOFb6TF4jSC7USdH03jogPMtfg7qDHrMd';
const BOT_TOKEN = '508617689:AAEuLPKs-EhrjrYGnz60inYNZqakf6HJWc0';
const BOT = new TelegramBot(BOT_TOKEN, {polling: true});


// Bot response
// ------------------------------------------------------------
BOT.onText(/\/pic/, function (msg, match) {
	sendResponse(msg.from.id, 'pic');
});

BOT.onText(/\/desc/, function (msg, match) {
	sendResponse(msg.from.id, 'desc');
});

BOT.onText(/\/all/, function (msg, match) {
	sendResponse(msg.from.id, 'all');
});


// Functions
// ------------------------------------------------------------
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