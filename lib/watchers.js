var _conf = global.conf;

var _path = require('path');
var _async = require('async');
var _fs = require('fs');
var _ = require('underscore');

var _md = require('./moviedata');
var _tvd = require('./tvdata');
var _logger = require('./logger');
var _db = require('./db');
var _parser = require('./mediaparse');
var _discrep = require('./discrep');

var _watchers = [];

function load()
{
	var files = _fs.readdirSync(_path.join(__dirname, 'watchers'));

	files.forEach(function(f)
	{
		var path = _path.join(__dirname, 'watchers', f);

		_watchers.push(require(path));
	});
}

function refresh(cb)
{
	_async.series([
		function(cb)
		{
			_async.each(_watchers, function(w,cb)
			{
				w.refresh(cb);

			}, cb);
		},
		findMetadata,
		function(cb)
		{
			_db.Discrepancy.findAll().complete(function (err, res)
			{
				_logger.info('Found %d discrepancies', res.length);

				return cb();
			});
		}

	], function(err)
	{
		if (err)
			_logger.err('Unexpected error refreshing watchers: %s', err.message ? err.message : JSON.stringify(err));

		if (cb)
			return cb();
	});
}

function findMetadata(cbfind)
{
	var a = [];
	var medialist;

	_async.series([
		function (cb)
		{
			_db.Media.findAll({ where: { state: 'needsmetadata' }}).complete(function (err, res)
			{
				if (err)
					return cb(err);

				medialist = res;

				if (!medialist.length)
					return cbfind();

				_logger.info('%d media items need info', medialist.length);

				return cb();
			});
		}, function (cb)
		{
			_logger.info('Parsing media file names');

			_async.each(medialist, function (e, cb)
			{
				var info;

				if (e.type === 'FolderItem')
					info = _parser.parseFilename(e.abspath);
				else if (e.type === 'MovieNZB')
					info = _parser.parseNZB(e.title);

				if (info === undefined)
					_discrep.noparse(e, cb);
				else if (info === null)
				{
					e.state = 'discarded';
					e.save().complete(cb);
					//_logger.info('%s\nDISCARDING\n', path);
					//return cb();
				}
				else
				{
					a.push([e, info]);
					return cb();
				}
			}, function (err)
			{
				if (err)
					return cbfind(err);

				_async.eachSeries(a, function (item, cb)
				{
					var m = item[0];
					var info = item[1];

					switch (info.type)
					{
						case 'TV':
							_tvd.findTVMetadataFromName(m, info, function(err)
							{
								if (err)
									return cb(err);

								m.type = 'TV';

								m.save().complete(cb);
							});
							break;
						case 'Movie':
							_md.findMovieMetadataFromName(m, info, function(err)
							{
								if (err)
									return cb(err);

								if (m.type === 'FolderItem')
									m.type =  'Movie';

								m.save().complete(cb);
							});
							break;
					}
				}, cb);

			});
		}], cbfind);
}

module.exports = {

	load : load,
	refresh : refresh

}