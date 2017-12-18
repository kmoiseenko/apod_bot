let TelegramBot = require('node-telegram-bot-api');
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const API_LINK = 'https://api.nasa.gov/planetary/apod?api_key=rom93FHJOFb6TF4jSC7USdH03jogPMtfg7qDHrMd';
const BOT_TOKEN = '508617689:AAEuLPKs-EhrjrYGnz60inYNZqakf6HJWc0';
const BOT = new TelegramBot(BOT_TOKEN, {polling: true});

BOT.onText(/\/pic/, function (msg, match) {
	let userId = msg.from.id;

	getData(API_LINK).then(
		response => {
			BOT.sendPhoto(userId, JSON.parse(response).url);
		},
		error => console.log(error)
	);
});

BOT.onText(/\/desc/, function (msg, match) {
	let userId = msg.from.id;

	getData(API_LINK).then(
		response => {
			let parseResponse = JSON.parse(response);
			let desc = '<b>' + parseResponse.title + '</b>' + '\n' + parseResponse.explanation;

			BOT.sendMessage(userId, desc, {parse_mode: 'HTML'});
		},
		error => console.log(error)
	);
});

BOT.onText(/\/all/, function (msg, match) {
	let userId = msg.from.id;
	
	getData(API_LINK).then(
		response => {
			let parseResponse = JSON.parse(response);
			let desc = '<b>' + parseResponse.title + '</b>' + '\n' + parseResponse.explanation;

			BOT.sendPhoto(userId, parseResponse.url);
			BOT.sendMessage(userId, desc, {parse_mode: 'HTML'});
		},
		error => console.log(error)
	);
});

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