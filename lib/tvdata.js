var _async = require('async');
var _moment = require('moment');
var _string = require('underscore.string');

var _tvdb = require('./tvdb');
var _imdb = require('./imdb');
var _logger = require('./logger');
var _db = require('./db');
var _discrep = require('./discrep');
var _helper = require('./helper');

var SERIES_CACHE_AGE_MAX = 1000 * 60 * 60 * 24 * 5;     // 5 days

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


			// If we have an image, get it
			if (ep && ep.poster_file)
			{
				var filename = 'episode_' + _helper.imageHash(m.title, _moment([m.airyear, m.airmonth - 1, m.airday]).toString()) + '_poster.' + ep.poster_file.substr(ep.poster_file.length - 3);
				_helper.downloadImage('http://thetvdb.com/banners/' + ep.poster_file, filename, 'Poster for ' + m.title, function(err)
				{
					if (err)
						return cb(err);

					m.poster_file = filename;

					return cb();
				});
			}
			else
				return cb();

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
						tvdb_id: e.id,
						poster_file : e.filename
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

			var images = [];

			if (tvdbinfo.poster)
				images.push(
				{
					url: 'http://thetvdb.com/banners/' + tvdbinfo.poster,
					filename: 'series_' + _helper.imageHash(series.title, series.first_air_date.getYear()) + '_poster.' + tvdbinfo.poster.substr(tvdbinfo.poster.length - 3),
					title: 'Poster for ' + series.title
				});
			

			if (tvdbinfo.banner)
			{
				images.push({
					url: 'http://thetvdb.com/banners/' + tvdbinfo.banner,
					filename: 'series_' + _helper.imageHash(series.title, series.first_air_date.getYear()) + '_banner.' + tvdbinfo.banner.substr(tvdbinfo.banner.length - 3),
					title: 'Banner for ' + series.title
				});
			}

			_async.each(images, function (e, cb)
			{
				_helper.downloadImage(e.url, e.filename, e.title, cb);
			}, function (err)
			{
				if (err)
					return cb(err);

				if (tvdbinfo.poster)
					series.poster_file = images[0].filename;
				if (tvdbinfo.banner && images[1])
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

module.exports = {
	findTVMetadataFromName : findTVMetadataFromName
};
