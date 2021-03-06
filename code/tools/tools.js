// Node modules
// ------------------------------------------------------------
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let moment = require('moment');


module.exports = {
	checkExtention: function (url) {
		let extention =  url.split('.').pop();
		let result = extention;

		switch(extention) {
			case 'jpg':
				result = 'jpeg';
			break;

			// Can be something else. Testing
			// default:
			// 	result = extention;
			// break;
		}

		return result;
	},
	getCurrentTime: function () {
		return moment().format("MM-DD-YYYY HH:mm");
	},
	getData: function (url) {
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
	},
};
