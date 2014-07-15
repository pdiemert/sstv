var _conf = global.conf;

var _fp = require('feedparser');
var _request = require('request');
var _path = require('path');
var _fs = require('fs');
var _async = require('async');
var _url = require('url');
var _ = require('underscore');
var _string = require('underscore.string');

var _helper = require('../helper');
var _db= require('../db');
var _logger = require('../logger');

var _sources = {};

function init()
{
	var files = _fs.readdirSync(_path.join(__dirname, '../webvideo-sources'));

	files.forEach(function(f)
	{
		var path = _path.join(__dirname, '../webvideo-sources', f);

		var b = _path.basename(f);

		b = b.substr(0, b.lastIndexOf('.'));

		_sources[b] = require(path);
	});
}

function saveAttr(name, guid, attr, cb)
{
	_db.Media.findOrInitialize({ hash : guid }).complete(function(err, m, finit)
	{
		if (err)
			return cb(err);

		// If not initializing, check poster, if all good then punt
		if (!finit)
		{
			if (!attr.poster || (m.poster_file && _fs.existsSync(_helper.imagePath(m.poster_file))))
				return cb(null, m);
		}

		function finish()
		{
			_logger.info('%s webvideo "%s"', finit ? 'Saving' : 'Updating', attr.title);

			m.title = attr.title;
			m.description = attr.description;
			m.type = 'WebVideo';
			m.source_name = name;
			m.url = attr.link;
			m.hash = guid;
			m.state = 'ready';

			if (attr.channel_name)
				m.channel_name = attr.channel_name;


			m.save().complete(function(err)
			{
				if (err)
					return cb(err);

				cb(null, m);
			});
		}
		if (attr.poster)
		{
			var url = _url.parse(attr.poster);

			var ext = attr.poster.substr(attr.poster.lastIndexOf('.'));

			var filename = _string.slugify(url.host + url.path.substr(0,url.path.lastIndexOf('.'))) + '_poster' + ext;

			_helper.downloadImage(attr.poster, filename, function(err)
			{
				if (err)
					return cb(err);

				m.poster_file = filename;

				finish();
			});
		}
		else
			finish();
	});
}

function refreshPage(name, s, cfg, cb)
{
	var url;
	if (_.isFunction(s.url))
		url = s.url(cfg);
	else
		url = s.url;

	var feedtitle = cfg.title ? (name + ' / ' + cfg.title) : name;

	_logger.info('Downloading webvideo page for %s', feedtitle);

	function finish(err)
	{
		_logger.info('Finished webvideo page for %s', feedtitle);

		return cb(err);
	}

	_helper.jqueryPage(url, function(err, $, bod)
	{
		s.pageHandler($, bod, cfg, function(err, attr)
		{
			if (Array.isArray(attr))
			{
				_async.eachSeries(attr, function(a, cb)
				{
					saveAttr(name, a.link, a, finish);

				}, cb);
			}
			else
			{
				saveAttr(name, attr.link, attr, finish);
			}
		});
	});
}


function refreshRSS(name, s, cfg, cb)
{
	var url;
	if (_.isFunction(s.url))
		url = s.url(cfg);
	else
		url = s.url;

	var req = _request(url);
	var parser = new _fp();
	var items = [];

	var feedtitle = cfg.title ? (name + ' / ' + cfg.title) : name;

	_logger.info('Downloading webvideo RSS from %s', feedtitle);

	req.on('error', function (err)
	{
		_logger.err('Error trying to retrieve %s: %s', url, err);
	});

	req.on('response', function (res)
	{
		var stream = this;

		if (res.statusCode != 200)
			return _logger.err('Bad status code (%d) fetching %s', res.statusCode, s.url);

		stream.pipe(parser);
	});

	parser.on('error', function(err)
	{
		_logger.err('Error parsing %s: %s', url, err);
	});

	parser.on('readable', function()
	{
		// This is where the action is!
		var stream = this
			, meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
			, item;

		while (item = stream.read())
			items.push(item);
	});

	parser.on('end', function()
	{
		var all = {};

		_async.series([
			function(cb)
			{
				var where = { type : 'WebVideo', source_name : name };
				if (s.hasChannels)
					where.channel_name = cfg.channel;

				_db.Media.findAll({where : where}).complete(function(err, data)
				{
					if (data)
					{
						data.forEach(function(m)
						{
							all[m.hash] = m;
						});
					}

					return cb();
				});
			},
			function(cb)
			{
				_async.eachSeries(items, function(item, cb)
				{
					// If we already have an item make sure image exists
					if (all[item.guid] && (!all[item.guid].poster_file || _fs.existsSync(_helper.imagePath(all[item.guid].poster_file))))
					{
						return cb();
					}

					if (s.linkPageHandler)
					{
						_helper.jqueryPage(item.link, function(err, $, bod)
						{
							if (err)
								return cb(err);

							s.linkPageHandler(item, $, bod, cfg, function(err, attr)
							{
								if (err)
									return cb(err);

								if (!attr)
									return cb();

								saveAttr(name, item.guid, attr, function(err, m)
								{
									if (err)
										return cb(err);

									all[m.hash] = m;

									cb();
								});
							});
						});
					}
				}, function(err)
				{
					if (err)
						_logger.err('Unexpected error refreshing RSS from %s: %s', feedtitle, err);

					_logger.info('Finished with RSS for %s', feedtitle);

					return cb(err);
				});
			}
		], cb);
	});
}

function refresh(cb)
{
	return cb();

	if (!_conf.webvideo_subscriptions)
		return cb();

	_async.each(Object.keys(_conf.webvideo_subscriptions), function(name, cb)
	{
		var s = _sources[name];

		var cfg = _conf.webvideo_subscriptions[name];

		if (!Array.isArray(cfg))
			cfg = [cfg];

		_async.each(cfg, function(c, cb)
		{
			switch(s.type)
			{
				case 'rss':
					refreshRSS(name, s, c, cb);
					break;
				case 'page':
					refreshPage(name, s,c, cb);
					break;
			}

		}, cb);

	}, cb);
}

init();

module.exports = {
	refresh : refresh
};