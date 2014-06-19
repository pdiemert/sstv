var _conf = global.conf;

var _request = require('request');
var _cheerio = require('cheerio');

var _tvdb = new (require('node-tvdb'))(_conf.thetvdb_apikey);

var _helper = require('./helper');

function seriesSearch(title, cb)
{
	_request('http://thetvdb.com/index.php?string=' + encodeURIComponent(title) + '&searchseriesid=&tab=listseries&function=Search',function(err,res,bod)
	{
		if (err)
			return cb(err);

		var $ = _cheerio.load(bod);

		var tvdb_id = parseInt($('#listtable tr').eq(1).find('td').eq(2).text());

		return cb(null, tvdb_id);
	});

}

function searchSeriesExact(title, cb)
{
	_tvdb.getSeries(title, cb);
}

function getSeriesAllById(id, cb)
{
	_tvdb.getSeriesAllById(id, cb);
}

function getSeriesByIMDBID(id, cb)
{
	_tvdb.getSeriesByRemoteID(id, cb);
}

module.exports = {
	searchSeries : _helper.cache(seriesSearch),
	getSeriesAllById : _helper.cache(getSeriesAllById),
	getSeriesByIMDBID : _helper.cache(getSeriesByIMDBID),
	searchSeriesExact : _helper.cache(searchSeriesExact),
};