//var _imdb = require('imdb-api');
var _imdb = require('imdb-node');
var _helper = require('./helper');

var _cache;

function get(search, cb)
{
	_imdb(search, function(res, err)
	{
		return cb(err, res);
	});
	//_imdb.get(search, cb);
}

module.exports = {
	get : _helper.cache(get)
};