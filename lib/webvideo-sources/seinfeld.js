var _string = require('underscore.string');
var _moment = require('moment');
var _helper = require('../helper');

function handler($, bod, cfg, cb)
{
//  \$\("#today.*(\{.*\})

	var regex = /\$\("#today.*(\{.*\})/gi;

	var ar = []
	var result;
	while ( (result = regex.exec(bod)) )
	{
		var obj = JSON.parse(result[1]);

		var attr = {
			link : obj.mp4,
			poster : obj.jpg,
			description : '',
			title : obj.title + ' (' + obj.venue + ')',
			date : _moment('1-1-' + obj.appearance)
		};

		ar.push(attr);
	}

	return cb(null, ar);
}

module.exports = {
	type : 'page',
	url : 'http://www.jerryseinfeld.com',
	pageHandler : handler
};