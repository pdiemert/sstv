var _string = require('underscore.string');
var _moment = require('moment');
var _helper = require('../helper');

function linkPageHandler(item, $, bod, cfg, cb)
{
	var link;

	function finish()
	{
		if (!link)
			return cb(null, null);
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
			// Try hd then sd

			try
			{
			link = (bod.match(/.*"hd":\{[^\{\}]*"url":"([^"]*)".*\}.*/mi) ||
				bod.match(/.*"sd":\{[^\{\}]*"url":"([^"]*)".*\}.*/mi))[1];
			}
			catch(ex)
			{
				return cb(null, null);
			}
			finish();
		});
	}
	else
	{
		var url = $('.entry-content iframe').eq(0).attr('src');

		if (url)
			link = 'http:' + url;

		finish();
	}
}

module.exports = {
	type : 'rss',
	url : 'http://laughingsquid.com/feed/',
	hasChannels : false,
	linkPageHandler : linkPageHandler
};
