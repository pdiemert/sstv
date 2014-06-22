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


function makeItems(res)
{
	return res.map(function(e) {

		var item = { media_id : e.id };
		if (e.poster_file)
			item.thumb = _path.join(_conf.image_dir, e.poster_file);

		if (e.type == 'TV')
		{
			item.title = e.series;

			var html = '';

			if (e.title)
			{
				html += e.title;
				if (e.season_number)
					html += '&nbsp;/ S' + e.season_number + 'xE' + e.episode_number;
			}
			else
			{
				if (e.season_number)
					html = 'Season ' + e.season_number + ', Episode ' + e.episode_number;
			}

			if (e.airyear && e.airmonth && e.airday)
			{
				if (html.length)
					html += '<br>';
				html += 'Aired ' + _moment([e.airyear, e.airmonth - 1, e.airday]).fromNow();
			}
			item.html = html;
		}
		else if (e.type == 'WebVideo')
		{
			item.title = e.source_name;
			item.html = e.title;
		}
		else
		{
			item.title = e.title + ' (' + e.year + ')';

			if (e.rating)
			{
				html = '';

				for(var i=0; i < e.rating; i++)
				{
					html += '★'; /*e.rating >= (i+1) ? : '☆'*/ ;
				}

				html += '&nbsp;- ' + e.rating + ' / 10<br>' + e.votes + ' votes';

				item.html = html;
			}
		}

		if (e.last_play_progress_sec)
		{
			item.html += '&nbsp;/ ';

			var perc = (e.last_play_progress_sec / e.duration_sec) * 10;
			for(var i=0; i < 10; i++)
				item.html += i < perc ? ':' : '.';

			item.html += '&nbsp;' + ((e.duration_sec - e.last_play_progress_sec) / 60).toFixed(0) + 'm left';

		}

		return item;
	});
}

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
