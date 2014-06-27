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

	if (_conf.refresh_on_start)
		refresh();
}

function refreshRSS(name, s, cfg)
{
	var url;
	if (_.isFunction(s.url))
		url = s.url(cfg);
	else
		url = s.url;

	var req = _request(url);
	var parser = new _fp();
	var items = [];

	_logger.info('Downloading webvideo RSS from %s', cfg.title ? (name + ' / ' + cfg.title) : name);

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
					if (all[item.guid] && (!item.poster_file || _fs.existsSync(_helper.imagePath(item.poster_file)))
					{
						return cb();
					}

					if (s.linkPageHandler)
					{
						_helper.jqueryPage(item.link, function(err, $, bod)
						{
							if (err)
								return cb(err);

							var m = _db.Media.build();

							s.linkPageHandler(item, $, bod, function(err, attr)
							{
								if (err)
									return cb(err);

								function finish()
								{

									_logger.info('Saving webvideo "%s"', attr.title);

									m.title = attr.title;
									m.description = attr.description;
									m.type = 'WebVideo';
									m.source_name = name;
									m.url = attr.link;
									m.hash = item.guid;
									m.state = 'ready';

									all[m.hash] = m;

									m.save().complete(function(err)
									{
										if (err)
											return cb(err);

										cb();
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
						});
					}
				}, function(err)
				{
					_logger.info('Finished with RSS from %s', name);

					return cb(err);
				});
			}
		])
	});
}

function refresh()
{
	if (!_conf.webvideo_subscriptions)
		return;

	for(var name in _conf.webvideo_subscriptions)
	{
		var s = _sources[name];

		var cfg = _conf.webvideo_subscriptions[name];

		if (!Array.isArray(cfg))
			cfg = [cfg];

		cfg.forEach(function(c)
		{
			switch(s.type)
			{
				case 'rss':
					refreshRSS(name, s, c);
					break;
			}
		});
	}
}

init();