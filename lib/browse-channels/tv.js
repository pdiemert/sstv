var _conf = global.conf;
var _db = require('../db');
var _moment = require('moment');
var _path = require('path');

function init()
{
}

function getItems(path, cb)
{
	if (!path)
	{
		return cb (null, [{type : 'Section', title : 'TV', id : 'tv'}]);
	}
	else if (path[0] !== 'tv')
		return cb(null, null);
	else
	{
		if (path.length == 1)
		{
			_db.query('SELECT DISTINCT(series) AS title, s.tvdb_id AS id, s.poster_file FROM media m, serieses s WHERE m.type = "TV" AND s.title = m.series ORDER BY title').complete(function(err, res)
			{
				var list = res.map(function(e) { return { type : 'Section', title : e.title, id : e.id, poster_file : e.poster_file }; });

				return cb(null, list);
			});
		}
		else if (path.length == 2)
		{
			_db.query('SELECT DISTINCT(season_number), s.poster_file FROM Media m, Serieses s WHERE m.series_tvdb_id = ' + path[1] + ' AND s.tvdb_id = m.series_tvdb_id ORDER BY m.season_number').complete(function(err, res)
			{
				var list = res.map(function(e) { return { type : 'Section', title : 'Season ' + e.season_number , id : e.season_number, poster_file : e.poster_file }; });

				return cb(null, list);
			});

		}
		else if (path.length == 3)
		{
			_db.Media.findAll({where : { series_tvdb_id : path[1], season_number : path[2] }, order : 'episode_number'}).complete(cb);
		}
	}
}

init();

module.exports = {
	getItems : getItems
};
