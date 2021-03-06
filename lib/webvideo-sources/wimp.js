var _string = require('underscore.string');
var _moment = require('moment');

function linkPageHandler(item, $, bod, cfg, cb)
{
	var link = item.link;

	if (!link)
		return cb(new Error('Unable to find link on page ' + item.link));

	var attr = {
		link : link,
		poster : item.description.match(/^.*img.*src *= *"([^"]*)".*$/im)[1],
		description : _string.unescapeHTML(item.description.match(/^.*\<td *valign *= *"top" *\>([^\<]*).*$/im)[1]),
		title : _string.trim((_string.endsWith(item.title, '[VIDEO]') || _string.endsWith(item.title, '[STORY]')) ? item.title.substr(0, item.title.length - 7) : item.title),
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