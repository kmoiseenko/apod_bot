// Commands
// ------------------------------------------------------------
let str_commands = {
	subscribe: 'subscribe',
	unsubscribe: 'unsubscribe',
	pic: 'pic',
	desc: 'desc',
	all: 'all',
};

module.exports = {
	str_subscribe: str_commands.subscribe,
	str_unsubscribe: str_commands.unsubscribe,
	str_pic: str_commands.pic,
	str_desc: str_commands.desc,
	str_all: str_commands.all,
	comm_subscribe: new RegExp('\\/' + str_commands.subscribe),
	comm_unsubscribe: new RegExp('\\/' + str_commands.unsubscribe),
	comm_pic: new RegExp('\\/' + str_commands.pic),
	comm_desc: new RegExp('\\/' + str_commands.desc),
	comm_all: new RegExp('\\/' + str_commands.all)
};