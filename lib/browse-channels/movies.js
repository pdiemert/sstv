var _conf = global.conf;

var _db = require('../db');
var _path = require('path');

function init()
{
}

function getItems(path, cb)
{
	if (!path)
	{
		return cb(null, [{
			type : 'Section',
			title : 'Movies',
			id : 'movies'
		}]);
	}
	else if (path[0] !== 'movies')
		return cb(null, null);
	else
	{
		_db.Media.findAll({ where : { state : 'ready', type : 'Movie' }, order : 'title'}).complete(cb);
	}
}

init();

module.exports = {
	getItems : getItems
}