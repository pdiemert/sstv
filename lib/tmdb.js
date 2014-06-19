var _conf = global.conf;

var _moviedb = require('moviedb')(_conf.themoviedb_apikey);
var _helper = require('./helper');
var _cheerio = require('cheerio');
var _request = require('request');

function searchMovieFuzzy(title, cb)
{
	/*
	_request('http://www.themoviedb.org/search?query=' + encodeURIComponent(title),function(err,res,bod)
	{
		var $ = _cheerio.load(bod);

		var path = $('ul.search_results li').eq(1).find('.info h3 a').attr('href');

		console.log(path);
	});/*
	_helper.jqueryPage('http://www.themoviedb.org/search?query=' + encodeURIComponent(title) ,function(err, $)
	{
		if (err)
			return cb(err);

		var path = $('ul.search_results li').eq(1).find('.info h3 a').attr('href');


		return cb(null, tvdb_id);
	});
	*/

}

function searchMovie(movie, year, cb)
{
	var qry = { query : movie };
	if (arguments.length == 2)
		cb = year;
	else
		qry.year = year;

	_moviedb.searchMovie(qry, cb);
}

function movieInfo(id, cb)
{
	_moviedb.movieInfo({id: id}, cb);
}

function configuration(cb)
{
	_moviedb.configuration(cb);
}

module.exports = {
	searchMovie : searchMovie,
	searchMovieFuzzy : searchMovieFuzzy,
	configuration : configuration,
	movieInfo : movieInfo
};