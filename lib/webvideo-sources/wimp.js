var _string = require('underscore.string');
var _moment = require('moment');

function linkPageHandler(item, $, bod, cb)
{
	var link = bod.match(/s1\.addVariable\( *"file" *, *"(.*)"\);/i)[1];

	if (!link)
		return cb(new Error('Unable to find link on page ' + item.link));

	var attr = {
		link : link,
		poster : item.description.match(/^.*img.*src *= *"([^"]*)".*$/im)[1],
		description : _string.unescapeHTML(item.description.match(/^.*\<td *valign *= *"top" *\>([^\<]*).*$/im)[1]),
		title : _string.trim(_string.endsWith(item.title, '[VIDEO]') ? item.title.substr(0, item.title.length - 7) : item.title),
		date : _moment(item.date)
	};

	return cb(null, attr);
}

module.exports = {
	type : 'rss',
	url : 'http://wimp.com/rss',
	hasChannels : false,
	linkPageHandler : linkPageHandler
};