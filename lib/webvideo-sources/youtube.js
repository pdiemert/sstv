var _string = require('underscore.string');
var _moment = require('moment');

function linkPageHandler(item, $, bod, cfg, cb)
{
	var link = item.link;

	var attr = {
		link : link,
		poster : item.description.match(/<img .* src *= *"(.*)"/im)[1],
		description : $('#eow-description').contents().get(0).data,
		title : item.title,
		date : _moment(item.date),
		channel_name : cfg.title
	};

	return cb(null, attr);
}

function urlHandler(cfg)
{
	return 'http://www.youtube.com/rss/user/' + cfg.channel + '/feed.rss';
}

module.exports = {
	type : 'rss',
	url : urlHandler,
	linkPageHandler : linkPageHandler
};