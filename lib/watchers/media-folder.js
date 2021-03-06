var _conf = global.conf;

var _path = require('path');
var _async = require('async');
var _fs = require('fs');
var _path = require('path');


var _logger = require('./../logger');
var _helper = require('./../helper');
var _db = require('./../db');
var _discrep = require('./../discrep');
var _refreshing = false;
var _refreshQueued = false;
var _extMap = {};

// /Volumes/c$/Media/TV/Brooklyn Nine-Nine/Brooklyn Nine-Nine - 1x01 - Pilot.mkv
//var info = _parser.parse("/Volumes/c$/Media/TV/Brooklyn Nine-Nine/Brooklyn Nine-Nine - 1x01 - Pilot.mkv");
//var info = _parser.parse("z:\\Media\\TV\\Brooklyn Nine-Nine\\Brooklyn Nine-Nine - 1x05 - The Vulture.mkv");
//console.log(info);
//return;


function init() {
	_conf.mpv_extensions.forEach(function (e) {
		_extMap[e.toUpperCase()] = true;
	});

	console.log('Watching %s', _conf.media_dir);
	var _watchr = require('watchr');
	
	_watchr.watch({ paths : [_conf.media_dir], listeners : {
		change : function(ch,f) {
			if (ch === 'create') {
				_logger.info('Detected %s to "%s"', ch, f);
				refresh();
			}
		}
	}});
}

function scanDirectory(cb)
{
	var map_path_to_media = {};
	var map_hash_to_media = {};
	var map_path_to_found = {};
	var all_media;
	var files;
	var count = 0;
	var cnew = 0;
	var cupdate = 0;

	var MPATH = _conf.use_relative_media_paths ? 'relpath' : 'abspath';

	var upd = setInterval(function ()
	{
		if (!files || !files.length)
			return;

		var perc = ~~((count / files.length) * 100);

		process.stdout.write('\r' + perc + '% complete ');

	}, 1000);

	_async.series([
		function (cb)
		{
			_db.Media.findAll({where: _db.or({ type: 'TV' }, { type: 'Movie' }, { type: 'FolderItem' })}).complete(function (err, res)
			{
				if (err)
					return cb(err);

				_logger.info('Found %d existing folder items', res.length);

				// Create a map using abs path
				res.forEach(function (m)
				{
					map_path_to_media[m[MPATH]] = m;
					map_hash_to_media[m.hash] = m;
				});

				all_media = res;

				return cb();
			});
		}, function (cb)
		{
			_logger.info('Scanning media dir %s', _conf.media_dir);

			_helper.dirScan(_conf.media_dir, function (err, res)
			{
				if (err)
					return cb(err);

				files = res;
				return cb();
			});
		}, function (cb)
		{
			_logger.info('%d files found, checking each', files.length);

			_async.eachSeries(files, function (f, cb)
				{
					function finishFile(err)
					{
						count++;
						return cb(err);
					}
					
					var ext = _path.extname(f).substr(1).toUpperCase();

					if (!_extMap[ext])
						return finishFile();

					var rel = f.substr(_conf.media_dir.length + 1);
					map_path_to_found[rel] = true;

					_fs.stat(f, function (err, st)
					{
						if (err)
							return finishFile(err);

						var m = map_path_to_media[_conf.use_relative_media_paths ? rel : f];

						if (m)
						{
							if (m.state == 'hasdiscrepancy')
								return finishFile();

							var images_exist = (!m.backdrop_file || _fs.existsSync(_path.join(process.cwd(), 'public', _conf.image_dir, m.backdrop_file))) && (!m.poster_file || _fs.existsSync(_path.join(process.cwd(), 'public', _conf.image_dir, m.poster_file)));

							// Can skip if media files exist and timestamp hasn't changed
							if (m.filedate.getTime() == st.mtime.getTime() && (images_exist || m.state === 'needsmetadata'))
							{
								return finishFile();
							}
						}
						else
						{
							// No existing, create
							m = _db.Media.build();
						}

						_helper.hashVideoFile(f, function (err, hash)
						{
							if (err)
								return finishFile(err);

							function remain()
							{
								// Set data
								m.hash = hash;
								m.relpath = f.substr(_conf.media_dir.length + 1);
								m.abspath = f;
								
								// Set date to current
								m.filedate = Date();
								_fs.utimesSync(f, m.filedate, m.filedate);
								m.type = 'FolderItem';

								m.state = 'needsmetadata';

								if (m.isNewRecord)
									cnew++;
								else
									cupdate++;

								map_path_to_media[m[MPATH]] = m;
								map_hash_to_media[hash] = m;

								m.save().complete(function(err)
								{
									finishFile(err);
								});
								
							}

							var other = map_hash_to_media[hash];

							if (other) {
								if ( other.abspath != f ) {

									// Could have just moved
									if ( !_fs.existsSync(other.abspath) ) {
										_logger.info('Path change %s -> %s', other.relpath, f.substr(_conf.media_dir.length + 1));

										other.abspath = f;
										other.relpath = f.substr(_conf.media_dir.length + 1);
										other.save().complete(function(err)
										{
											if (other.state == 'hasdiscrepancy') {
												return finishFile();
											}
											else
											{
												m = other;
												return remain();
											}
										});
									}
									else
									{
										if (other.state == 'hasdiscrepancy') {
											return finishFile();
										}
										
										return _discrep.dupe(other, f, true, finishFile);
									}
								}
								else
								{
									m = other;
									return remain();
								}
							}
							else
								return remain();
						});
					});

				}, cb);
		}, function (cb)
		{
			// Scan all to find those no longer in dir
			var todel = all_media.filter(function (m)
			{
				return !map_path_to_found[m[MPATH]];
			});

			if (todel.length) {
				
				// Mark as missing
				_async.each(todel, function(m, cb)
				{
					m.state = 'discarded';
					m.save().complete(cb);
				}, function(err)
				{
					if (err)
						return cb(err);
					
					console.log('%d items marked as missing', todel.length);

					return cb();
				});
			}
		}

	], function (err)
	{
		clearInterval(upd);

		_logger.info('\rMedia folder had %d new, %d updated', cnew, cupdate);

		return cb(err);
	});
}



function refresh(cb)
{
	if (_refreshing)
	{
		if (_refreshQueued)
			return;
		
		_refreshQueued = true;
		_logger.info('Queuing refresh');
		return;
	}
	_refreshing = true;
	
	_logger.info('Refreshing media folder');

	
	scanDirectory(function(err)
	{
		_refreshing = false;
		
		if (err)
			_logger.err(err);
		
		if (cb)
		{
			cb();
			cb = null;
		}
		
		if (_refreshQueued)
		{
			_refreshQueued = false;
			process.nextTick(refresh);
		}
	});
}

init();

module.exports = {
	refresh : refresh
};
