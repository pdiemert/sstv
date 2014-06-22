var _string = require('underscore.string');
var _moment = require('moment');

//var _req = _request('http://wimp.com/rss')
//var _parser = new _fp();
/*
_req.on('error', function (error)
{
	// handle any request errors
	console.log(err);
});
_req.on('response', function (res)
{
	var stream = this;

	if (res.statusCode != 200)
		return this.emit('error', new Error('Bad status code'));

	stream.pipe(_parser);
});


_parser.on('error', function(error)
{
	console.log(error);
});

var _item;
_parser.on('readable', function()
{
	// This is where the action is!
	var stream = this
		, meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
		, item;

	if (_item)
		return;
	_item = stream.read();

	_helper.jqueryPage(_item.link, function(err, $, bod)
	{
		var m = bod.match(/s1\.addVariable\( *"file" *, *"(.*)"\);/i);

		var el = $('#player embed');

		console.log(el.length);
	});

	 while (item = stream.read()) {


	 console.log(item);
	 }
});

*/
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