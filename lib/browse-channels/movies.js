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
		return cb (null, [{title : 'Movies', id : 'movies'}]);
	}
	else if (path[0] !== 'movies')
		return cb(null, null);
	else
	{
		_db.Media.findAll({ where : { state : 'ready', type : 'Movie' }, order : 'title'}).complete(function(err,res)
		{
			var list = res.map(function(e) { return { title : e.title, id : e.id, thumb : _path.join(_conf.image_dir, e.poster_file), media_id : e.id }; });

			return cb(null, list);
		});
	}
}

init();

module.exports = {
	getItems : getItems
}