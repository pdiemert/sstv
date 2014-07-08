var _string = require('underscore.string');
var _moment = require('moment');
var _helper = require('../helper');

function linkPageHandler(item, $, bod, cfg, cb)
{
	var link;

	function finish()
	{
		return cb(null, {
			link : link,
			title : _string.unescapeHTML(item.title),
			description : _string.unescapeHTML(item.summary),
			date : _moment(item.pubDate)
		});
	}

	// First check for vimeo embed
	var vplayer = $('.entry-content iframe').eq(0).attr('src');

	if (vplayer && vplayer.indexOf('vimeo') != -1)
	{
		_helper.jqueryPage('http:' + vplayer, function(err, $, bod)
		{
			link = bod.match(/.*"hd":\{[^\{\}]*"url":"([^"]*)".*\}.*/mi)[1];

			finish();
		});
	}
	else
	{
		link = 'http:' + $('.entry-content iframe').eq(0).attr('src');

		finish();
	}
	/*
	var link = $('#player video').attr('src');

	if (!link)
		return cb(new Error('Unable to find link on page ' + item.link));
		*/
/*
	var attr = {
		link : link,
		poster : item.description.match(/^.*img.*src *= *"([^"]*)".*$/im)[1],
		description : _string.unescapeHTML(item.description.match(/^.*\<td *valign *= *"top" *\>([^\<]*).*$/im)[1]),
		title : _string.trim(_string.endsWith(item.title, '[VIDEO]') ? item.title.substr(0, item.title.length - 7) : item.title),
		date : _moment(item.date)
	};
*/
	//return cb(null, attr);
}

module.exports = {
	type : 'rss',
	url : 'http://laughingsquid.com/feed/',
	hasChannels : false,
	linkPageHandler : linkPageHandler
};