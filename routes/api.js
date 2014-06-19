var _url = require('url');
var _express = require('express');
var _str = require('underscore.string');
var _router = _express.Router();

var _media = require('../lib/media');
var _player = require('../lib/player');
var _channels = require('../lib/channels');

_router.get('/player/play', function (req, res)
{
	_player.play();
	res.send({ mode : _player.mode() });
});

_router.get('/player/start/:media_id', function (req, res)
{
	_player.startMedia(req.params.media_id);

	res.send({ mode : _player.mode() });
});

_router.get('/player/stop', function (req, res)
{
	_player.stop();

	res.send({ mode : _player.mode() });
});

_router.get('/player/pause', function (req, res)
{
	_player.pause();

	res.send({ mode : _player.mode() });
});

_router.get('/player/seek/:amt', function (req, res)
{
	_player.seek(req.params.amt);

	res.send({ mode : _player.mode() });
});

_router.get('/player/mute', function (req, res)
{
	_player.mute();

	res.send({ mode : _player.mode() });
});

_router.get('/browse*', function(req, res)
{
	var url = _url.parse(req.url);

	url.pathname = _str.rtrim(url.pathname, '/');

	var parts = url.pathname.split('/');

	var path = parts.slice(2);

	_channels.getItems(path, function(err, items)
	{
		if (err)
			return res.send([]);

		res.send(items);
	});
});

_router.get('/new', function(req, res)
{

	_db.Media.findAll({order : [['createdAt','DESC']], limit : 50}).complete(function(err, res)
	{
		if (err)
			return res.send([]);

		var items = res.map(function(e) {

			var item = { title : e.title, thumb : e.poster_file, media_id : e.id };

			if (e.season_number)
				item.html = 'Season ' + e.season_number + ', Episode ' + e.episode_number + '<br>Aired ' + _moment([e.airyear, e.airmonth - 1, e.airday]).fromNow();

			return item;
		});

		res.send(items);
	});
});

module.exports = _router;
