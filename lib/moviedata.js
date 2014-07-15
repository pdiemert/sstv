var _async = require('async');
var _moment = require('moment');
var _moviedb = require('./tmdb');
var _helper = require('./helper');
var _logger = require('./logger');
var _db = require('./db');
var _discrep = require('./discrep');
var _imdb = require('./imdb');


var _cfg;       // Moviedb config

function findMovieMetadataFromName(m, info, cbfind)
{
	_logger.info('Finding metadata for Movie (#%d): %s (%s)', m.id, info.title, info.year || 'unknown year');

	var id;
	var movieinfo;
	var imdbinfo;
	var poster;
	var backdrop;

	_async.series([
		function(cb)
		{
			if (_cfg)
				return cb();

			_logger.info('Getting moviedb configuration');

			_moviedb.configuration(function (err, cfg)
			{
				if (err)
					return cb(err);

				_cfg = cfg;

				return cb();
			});
		},
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
			if (!movieinfo.poster_path)
				return cb();

			var url = _cfg.images.base_url + 'original' + movieinfo.poster_path;
			poster = _helper.imageHash(movieinfo.title, _moment(movieinfo.release_date).year()) + '_poster.' + movieinfo.poster_path.substr(movieinfo.poster_path.length - 3);

			_helper.downloadImage(url, poster, 'Poster for ' + movieinfo.title, cb);

		}, function (cb)
		{
			// Get backdrop
			if (!movieinfo.backdrop_path)
				return cb();

			var url = _cfg.images.base_url + 'original' + movieinfo.backdrop_path;
			backdrop = _helper.imageHash(movieinfo.title, _moment(movieinfo.release_date).year()) + '_backdrop.' + movieinfo.backdrop_path.substr(movieinfo.backdrop_path.length - 3);

			_helper.downloadImage(url, backdrop, 'Backdrop for ' + movieinfo.title, cb);

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
			m.title = movieinfo.title;
			m.year = _moment(movieinfo.release_date).year();
			m.description = movieinfo.overview;
			m.genres = movieinfo.genres.map(function (g) { return g.name; }).join(',');
			m.country = imdbinfo ? imdbinfo.country : null;
			m.votes = imdbinfo ? (parseInt(imdbinfo.votes) || null) : null;
			m.rating = imdbinfo ? (parseFloat(imdbinfo.rating) || null) : null;
			m.moviedb_id = movieinfo.id;
			m.imdb_id = movieinfo.imdb_id;
			m.poster_file = poster;
			m.backdrop_file = backdrop;
			m.ext = info.ext;
			m.state = 'ready';

			return cb();
		}


	], cbfind);
}

module.exports = {
	findMovieMetadataFromName : findMovieMetadataFromName
};
