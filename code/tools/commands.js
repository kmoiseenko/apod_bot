// Commands
// ------------------------------------------------------------
let str_commands = {
	subscribe: 'subscribe',
	unsubscribe: 'unsubscribe',
	all: 'all',
	about: 'about',
	contact: 'contact'
};

module.exports = {
	str_subscribe: str_commands.subscribe,
	str_unsubscribe: str_commands.unsubscribe,
	str_all: str_commands.all,
	str_about: str_commands.about,
	str_contact: str_commands.contact,
	comd_subscribe: new RegExp('\\/' + str_commands.subscribe),
	comd_unsubscribe: new RegExp('\\/' + str_commands.unsubscribe),
	comd_all: new RegExp('\\/' + str_commands.all),
	comd_about: new RegExp('\\/' + str_commands.about),
	comd_contact: new RegExp('\\/' + str_commands.contact)
};