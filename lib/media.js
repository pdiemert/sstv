var _conf = global.conf;

var _path = require('path');
var _async = require('async');
var _fs = require('fs');
var _http = require('http');
var _crypto = require('crypto');
var _path = require('path');
var _moment = require('moment');
var _string = require('underscore.string');


var _moviedb = require('./tmdb');
var _tvdb = require('./tvdb');
var _imdb = require('./imdb');
var _logger = require('./logger');
var _helper = require('./helper');
var _db = require('./db');
var _parser = require('./mediaparse');
var _discrep = require('./discrep');

var _extMap = {};

var SERIES_CACHE_AGE_MAX = 1000 * 60 * 60 * 24 * 5;     // 5 days

//var info = _parser.parse('/Volumes/c$/Media/Movies/Perf.T.S.Of.A.Murd.m-720p.Power.mkv');
//console.log(info);
//return;


function init()
{
	_conf.mpv_extensions.forEach(function (e)
	{
		_extMap[e.toUpperCase()] = true;
	});

	_db.on('ready', function ()
	{
		if (_conf.refresh_on_start)
			refresh();
	});
}

var csaved = 0;

function imageHash(title, year, series)
{
	var hash = _crypto.createHash('sha1');

	var str = title + ':' + year;
	if (series)
		str += series;

	return hash.update(str).digest('hex');
}

function scanDirectory(cb)
{
	var map_abs_to_media = {};
	var map_hash_to_media = {};
	var map_abs_to_found = {};
	var all_media;
	var files;

	var count = 0;
	var cnew = 0;
	var cupdate = 0;

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
			_logger.info('Getting existing media');

			_db.Media.findAll({where: _db.or({ type: 'TV' }, { type: 'Movie' }, { type: 'Unknown' })}).complete(function (err, res)
			{
				if (err)
					return cb(err);

				_logger.info('Found %d existing', res.length);

				// Create a map using abs path
				res.forEach(function (m)
				{
					map_abs_to_media[m.abspath] = m;
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

					map_abs_to_found[f] = true;


					_fs.stat(f, function (err, st)
					{
						if (err)
							return finishFile(err);

						var m = map_abs_to_media[f];

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

							var other = map_hash_to_media[hash];

							if (other)
							{
								if (other.state == 'hasdiscrepancy')
									return finishFile();

								if (other.abspath != f)
									return _discrep.dupe(other, f, true, finishFile);
								else
									m = other;
							}

							// Set data
							m.hash = hash;
							m.relpath = f.substr(_conf.media_dir.length + 1);
							m.abspath = f;
							m.filedate = st.mtime;
							m.type = 'Unknown';

							m.state = 'needsmetadata';

							if (m.isNewRecord)
								cnew++;
							else
								cupdate++;

							map_abs_to_media[f] = m;
							map_hash_to_media[hash] = m;

							m.save().complete(finishFile);
						});
					});

				}, cb);
		}, function (cb)
		{
			// Scan all to find those no longer in dir
			var todel = all_media.filter(function (m)
			{
				return !map_abs_to_found[m.abspath];
			});

			if (todel.length)
				console.log('Need to delete %d items', todel.length);

			/*
			 todel.forEach(function(m)
			 {
			 console.log(m.abspath);
			 });
			 */

			return cb();
		}

	], function (err)
	{
		clearInterval(upd);

		_logger.info('\r%d new, %d updated', cnew, cupdate);

		return cb(err);
	});
}

function downloadImage(url, filename, cb)
{
	var target = _path.join(process.cwd(), 'public', _conf.image_dir, filename);

	// Don't download if we've already got it
	if (_fs.existsSync(target))
		return cb();

	var file = _fs.createWriteStream(target);
	_http.get(url, function (response)
	{
		response.pipe(file);

		response.on('error', function (err)
		{
			return cb(err);
		});

		response.on('end', function ()
		{
			return cb();
		})
	});
}

function findTVMetadataFromName(m, info, cbfind)
{
	var imdbinfo;
	var tvdbinfo;
	var series_tvdb_id;
	var series;
	var episode;

	if (info.usesAirTime)
		_logger.info('Finding metadata for TV show (#%d): %s which aired %d-%d-%d', m.id, info.series, info.airyear, info.airmonth, info.airday);
	else
		_logger.info('Finding metadata for TV show (#%d): %s Season %d, Episode %d', m.id, info.series, info.season, info.episode);

	function finish(ep, cb)
	{
		_db.Series.find({where: { tvdb_id: series_tvdb_id }}).complete(function (err, s)
		{
			if (err)
				return cb(err);

			// Now update
			m.type = 'TV';
			m.title = ep ? ep.title : s.title;
			m.series = s.title;
			m.series_tvdb_id = s.tvdb_id;
			m.year = ep ? ep.airyear : info.airyear;
			m.description = ep ? ep.description : '';
			m.airyear = ep ? ep.airyear : info.airyear;
			m.airmonth = ep ? ep.airmonth : info.airmonth;
			m.airday = ep ? ep.airday : info.airday;
			m.episode_number = ep ? ep.episode : info.episode;
			m.season_number = ep ? ep.season : info.season;
			m.genres = s.genres;
			m.country = s.country;
			m.votes = s.votes;
			m.rating = s.rating;
			m.tvdb_id = ep ? ep.tvdb_id : null;
			m.imdb_id = s.imdb_id;
			m.poster_file = s.poster_file;
			m.ext = info.ext;
			m.state = 'ready';

			m.save().complete(cb);
		});
	}

	function findEp(cb)
	{
		// Try to find info
		var oldest = new Date(Date.now() - SERIES_CACHE_AGE_MAX);

		var query = 'updatedAt > ? AND series_tvdb_id = ?';
		var args = [oldest, series_tvdb_id];

		if (info.usesAirTime)
		{
			query += ' AND airyear = ? AND airmonth = ? AND airday = ?';
			args.push(info.airyear, info.airmonth, info.airday);
		}
		else
		{
			query += ' AND episode = ? AND season = ?';
			args.push(info.episode, info.season);
		}

		var where = [query].concat(args);

		_db.Episodes.find({ where: where}).complete(cb);
	}

	var detail = {};
	_async.waterfall([
		function (cb)
		{
			var oldest = new Date(Date.now() - SERIES_CACHE_AGE_MAX);

			if (info.season == 6 && info.episode == 11 )
			{
				console.log('foo');
			}
			// First try an exact match in our local
			_db.Series.find({where: ['title_slug=? and updatedAt > ?', _string.slugify(info.series), oldest]}).complete(cb);

		}, function (res, cb)
		{
			if (res)
			{
				series_tvdb_id = res.tvdb_id;

				return cb(null, null);
			}
			else
			{
				// Try to find online
				_tvdb.searchSeriesExact(info.series, cb);
			}
		}, function (res, cb)
		{
			if (series_tvdb_id)
				return cb(null, null);

			// If more than 4 results then ignore, skip
			if (res && (!Array.isArray(res) || res.length < 5))
			{
				detail.tvdbexact = true;

				// If more than one, pick the most current
				if (Array.isArray(res))
				{
					var d = 0;
					var idx;
					for (var i = 0; i < res.length; i++)
					{
						// Skip if no overview
						if (!res[i].Overview || _string.slugify(res[i].SeriesName).indexOf(_string.slugify(info.series)) == -1)
							continue;

						var air = _moment(res[i].FirstAired).valueOf();

						if (!d || air > d)
						{
							d = air;
							idx = i;
						}
					}

					res = res[idx];
				}

				series_tvdb_id = res.id;
				return cb(null, null);
			}
			else
			{
				detail.tvdbexact = false;

				// No exact match, try imdb
				_imdb.get(info.series, cb);
			}
		}, function (res, cb)
		{
			if (series_tvdb_id)
				return cb(null, null);

			if (res)
			{
				// got an imdb hit, now try to look it online
				detail.imdb = true;

				imdbinfo = res;

				_tvdb.getSeriesByIMDBID(imdbinfo.imdbid, cb);
			}
			else
			{
				detail.imdb = false;

				return cb(null, null);
			}
		}, function (res, cb)
		{
			if (series_tvdb_id)
				return cb(null, null);

			if (res)
			{
				detail.tvdbimdb = true;

				series_tvdb_id = Array.isArray(res) ? res[0].id : res.id;

				return cb(null, null);
			}
			else
			{
				detail.tvdbimdb = false;

				// Could not find by imdbid, last chance, try a fuzzy search
				_tvdb.searchSeries((imdbinfo && imdbinfo.title) || info.series, cb);
			}
		}, function (id, cb)
		{
			if (series_tvdb_id)
				return cb();

			if (id)
			{
				detail.tvdbfuzzy = true;
				series_tvdb_id = id;

				return cb();
			}
			else
			{
				detail.tvdbfuzzy = false;
				_discrep.notfound(m, info.series, 'TV', JSON.stringify(detail), cbfind);

			}
		}, function (cb)
		{
			// Should have tvdbid for series now
			findEp(cb);

		}, function (ep, cb)
		{
			if (ep)
			{
				return finish(ep, cbfind);
			}
			else
			{
				// Could not find episode, load from online
				_logger.info('Downloading episode data for %s', info.series);

				_tvdb.getSeriesAllById(series_tvdb_id, cb);
			}
		}, function (res, cb)
		{
			if (!res)
				return _discrep.notfound(m, info.series, 'TV', 'missing episode data from tvdb', cbfind);

			tvdbinfo = res;

			if (!imdbinfo)
				_imdb.get(tvdbinfo.SeriesName, cb);
			else
				return cb(null, null);
		},
		function(res, cb)
		{
			if (res)
				imdbinfo = res;
			else if (!imdbinfo && tvdbinfo.IMDB_ID)
				return _imdb.get(tvdbinfo.IMDB_ID, cb);

			cb(null, null);
		},
		function(res, cb)
		{
			if (res)
				imdbinfo = res;

			//_db.destroy({tvdb_id : series_tvdbid}).complete(cb);
			_db.Series.findOrInitialize({ tvdb_id: series_tvdb_id}, { tvdb_id: series_tvdb_id}).complete(cb);
		},
		function (s, f, cb)
		{
			series = s;

			s.tvdb_id = series_tvdb_id;
			s.title = tvdbinfo.SeriesName;
			s.description = tvdbinfo.Overview;
			s.imdb_id = imdbinfo ? imdbinfo.imdbid : null;
			s.genres = tvdbinfo.Genre ? tvdbinfo.Genre.split('|').filter(function (g)
			{
				return !!g.length;
			}).join(',') : 'Unknown';
			s.votes = (imdbinfo && parseInt(imdbinfo.votes)) || null;
			s.rating = (imdbinfo && parseFloat(imdbinfo.rating)) || null;
			s.first_air_date = _moment(tvdbinfo.FirstAired);
			s.country = imdbinfo ? imdbinfo.country : null;

			s.save().complete(cb);
		}, function (s, cb)
		{
			// Delete all episodes
			_db.Episodes.destroy({ series_tvdb_id: series_tvdb_id}).complete(cb);
		}, function (c, cb)
		{
			// Store all episode metadata
			if (tvdbinfo.Episodes)
			{
				_async.each(tvdbinfo.Episodes, function (e, cb)
				{
					if (!e.FirstAired)
						return cb();

					var d = _moment(e.FirstAired);

					_db.Episodes.create({
						title: e.EpisodeName,
						series_tvdb_id: series_tvdb_id,
						season: parseInt(e.SeasonNumber),
						episode: parseInt(e.EpisodeNumber),
						airyear: d.year(),
						airmonth: d.month() + 1,
						airday: d.date(),
						description: e.Overview,
						uses_air_time: info.usesAirTime,
						tvdb_id: e.id
					}).complete(cb);

				}, cb);
			}
			else
				return cb();

		}, function (cb)
		{
			// Now try to find again
			findEp(cb);
		}, function (ep, cb)
		{
			//if (!ep)
			//	return _discrep.notfound(m, info.series, 'TV', 'episode not listed in tvdb', cb);

			episode = ep;

			var images = [
				{
					url: 'http://thetvdb.com/banners/' + tvdbinfo.poster,
					filename: 'series_' + imageHash(series.title, series.first_air_date.getYear()) + '_poster.' + tvdbinfo.poster.substr(tvdbinfo.poster.length - 3)
				}
			];

			if (tvdbinfo.banner)
			{
				images.push({
						url: 'http://thetvdb.com/banners/' + tvdbinfo.banner,
						filename: 'series_' + imageHash(series.title, series.first_air_date.getYear()) + '_banner.' + tvdbinfo.banner.substr(tvdbinfo.banner.length - 3)
					});
			}

			_async.each(images, function (e, cb)
				{
					downloadImage(e.url, e.filename, cb);
				}, function (err)
				{
					if (err)
						return cb(err);

					series.poster_file = images[0].filename;
					if (tvdbinfo.banner)
						series.banner_file = images[1].filename;

					series.save().complete(cb);
				});
		}, function (s, cb)
		{
			finish(episode, cb)
		}], function (err)
		{
			if (err)
				console.log(err.stack);

			cbfind();
		});
}

function findMovieMetadataFromName(m, info, cfg, cbfind)
{
	_logger.info('Finding metadata for Movie (#%d): %s (%s)', m.id, info.title, info.year || 'unknown year');

	var id;
	var movieinfo;
	var imdbinfo;
	var poster;
	var backdrop;

	_async.series([
		function (cb)
		{
			_moviedb.searchMovie(info.title, info.year, function (err, res)
			{
				if (err)
					return cb(err);

				function finish(res)
				{
					if (res.results.length > 1)
					{
						// See if we can find one that matches exact
						var exact = res.results.filter(function (r)
						{
							return r.title.toUpperCase() == info.title.toUpperCase() || r.original_title.toUpperCase() == info.title.toUpperCase();
						});
						if (exact.length != 1)
							return _discrep.ambiguous(m, info.title, 'Movie', res.results.length, cbfind);

						id = exact[0].id;
					}
					else
						id = res.results[0].id;

					return cb();
				}

				if ((!res || !res.results || !res.results.length))
				{
					if (info.year)
					{
						function tryFuzzy()
						{
							return _discrep.notfound(m, info.title, 'Movie', 'title not found in moviedb', cbfind);
							/*
							_moviedb.searchMovieFuzzy(info.title, function(err, res)
							{
								if (err)
									return cb(err);

								if (!res || !res.results || !res.results.length)
									return _discrep.notfound(m, info.title, 'Movie', 'title not found in moviedb', cbfind);

								return finish(res);
							});
							*/
						}

						// If no results, try to search without year
						_moviedb.searchMovie(info.title, function (err, res)
						{
							if (err)
								return cb(err);

							if (!res || !res.results || !res.results.length)
								return tryFuzzy();

							return finish(res);
						});
					}
					else
						return tryFuzzy();
				}
				else
					return finish(res);
			});
		}, function (cb)
		{
			// Get movie info
			_moviedb.movieInfo(id, function (err, res)
			{
				if (err)
					return cb(err);

				movieinfo = res;

				return cb();
			});
		},
		function (cb)
		{
			// See if we exist
			_db.Media.find({where : { moviedb_id : movieinfo.id }}).complete(function(err, res)
			{
				if (err)
					return cb(err);

				if (res)
					return _discrep.dupe(m, res.abspath, false, cbfind);
				else
					return cb();
			});
		},
		function (cb)
		{
			// Get poster
			var url = cfg.images.base_url + 'original' + movieinfo.poster_path;
			poster = imageHash(movieinfo.title, _moment(movieinfo.release_date).year()) + '_poster.' + movieinfo.poster_path.substr(movieinfo.poster_path.length - 3);

			downloadImage(url, poster, cb);

		}, function (cb)
		{
			// Get backdrop
			if (movieinfo.backdrop_path)
			{
				var url = cfg.images.base_url + 'original' + movieinfo.backdrop_path;
				backdrop = imageHash(movieinfo.title, _moment(movieinfo.release_date).year()) + '_backdrop.' + movieinfo.backdrop_path.substr(movieinfo.backdrop_path.length - 3);

				downloadImage(url, backdrop, cb);
			}
			else
				return cb();

		}, function (cb)
		{
			if (movieinfo.imdb_id)
			{
				_imdb.get(movieinfo.imdb_id, function (err, res)
				{
					if (err)
						return cb(err);

					imdbinfo = res;

					return cb();
				});
			}
			else
				return cb();

		}, function (cb)
		{
			// Now update movie
			m.type = 'Movie';
			m.title = movieinfo.title;
			m.year = _moment(movieinfo.release_date).year();
			m.description = movieinfo.overview;
			m.genres = movieinfo.genres.map(function (g) { return g.name; }).join(',');
			m.country = imdbinfo ? imdbinfo.country : null;
			m.votes = imdbinfo ? parseInt(imdbinfo.votes) : null;
			m.rating = imdbinfo ? parseFloat(imdbinfo.rating) : null;
			m.moviedb_id = movieinfo.id;
			m.imdb_id = movieinfo.imdb_id;
			m.poster_file = poster;
			m.backdrop_file = backdrop;
			m.ext = info.ext;
			m.state = 'ready';


			m.save().complete(cb);
		}


	], cbfind);
}

function findMetadata(cbfind)
{
	var a = [];
	var medialist;

	var moviecfg;

	_async.series([
		function (cb)
		{
			_db.Media.findAll({ where: { state: 'needsmetadata' }}).complete(function (err, res)
			{
				if (err)
					return cb(err);

				medialist = res;
				return cb();
			});
		}, function (cb)
		{
			if (!medialist.length)
				return cbfind();

			_logger.info('%d items need metadata, getting moviedb configuration', medialist.length);

			_moviedb.configuration(function (err, cfg)
			{
				if (err)
					return cb(err);

				moviecfg = cfg;

				return cb();
			});
		}, function (cb)
		{
			_logger.info('Parsing media file names');

			_async.each(medialist, function (e, cb)
				{
					var path = e.abspath;

					var info = _parser.parse(path);

					if (info === undefined)
					{
						_discrep.noparse(e, cb);
					}
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
								findTVMetadataFromName(m, info, cb);
								break;
							case 'Movie':
								findMovieMetadataFromName(m, info, moviecfg, cb);
								break;
						}
					}, cb);

				});
		}], cbfind);
}

function refresh()
{
	_logger.info('Refreshing media');

	_async.series([scanDirectory, findMetadata], function (err)
	{
		if (err)
			_logger.err(err);

		_db.Discrepancy.findAll().complete(function (err, res)
			{
				_logger.info('Found %d discrepancies', res.length);
			});
	});
}


init();