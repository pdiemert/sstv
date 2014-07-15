var _conf = global.conf;

var _url = require('url');
var _express = require('express');
var _str = require('underscore.string');
var _router = _express.Router();
var _path = require('path');

var _player = require('../lib/player');
var _channels = require('../lib/channels');

var _db = require('../lib/db');
var _moment = require('moment');

_router.get('/player/play', function (req, res)
{
	_player.play();
	res.send({ mode : _player.mode() });
});

_router.get('/player/start/:media_id', function (req, res)
{
	_player.startMedia(req.params.media_id, function()
	{
		res.send({ mode : _player.mode() });
	});
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

_router.get('/player/mode', function (req, res)
{
	res.send({ mode : _player.mode() });
});

_router.get('/player/caudio', function (req, res)
{
	_player.cycleAudio();

	res.send({ mode : _player.mode() });
});

function makeItems(res)
{
	return res.map(function(e)
	{
		var item = e.values || e;

		if (item.poster_file)
			item.thumb_path = _path.join(_conf.image_dir, item.poster_file);

		if (item.type === 'TV')
			item.airago = _moment([item.airyear, item.airmonth - 1, item.airday]).fromNow();

		return item;
	});
}

function getChannelItems(req, res)
{
	var url = _url.parse(req.url);

	url.pathname = _str.rtrim(url.pathname, '/');

	var parts = url.pathname.split('/');

	var name = parts[1];

	var path = parts.slice(2);

	_channels.getItems(name, path, function(err, items)
	{
		if (err)
			return res.send([]);

		res.send(makeItems(items));
	});
}

_router.get('/browse*', getChannelItems);
_router.get('/find*', getChannelItems);


_router.get('/new', function(req, response)
{

	_db.Media.findAll({where: { state : 'ready', last_play_date : null }, order : [['createdAt','DESC']], limit : 50}).complete(function(err, res)
	{
		if (err)
			return response.send([]);

		response.send(makeItems(res));
	});
});

_router.get('/recent', function(req, response)
{

	_db.Media.findAll({where: ['state = ? AND last_play_date IS NOT NULL', 'ready'], order : [['last_play_date','DESC']], limit : 50}).complete(function(err, res)
	{
		if (err)
			return response.send([]);

		response.send(makeItems(res));
	});
});

module.exports = _router;
