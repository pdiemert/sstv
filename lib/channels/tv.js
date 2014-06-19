var _conf = global.conf;
var _db = require('../db');
var _moment = require('moment');

function init()
{
}

function getItems(path, cb)
{
	if (!path)
	{
		return cb (null, [{title : 'TV', id : 'tv'}]);
	}
	else if (path[0] !== 'tv')
		return null;
	else
	{
		if (path.length == 1)
		{
			_db.query('SELECT DISTINCT(series) AS title, s.tvdb_id AS id, s.poster_file FROM media m, serieses s WHERE m.type = "TV" AND s.title = m.series ORDER BY title').complete(function(err, res)
			{
				var list = res.map(function(e) { return { title : e.title, id : e.id, thumb : e.poster_file }; });

				return cb(null, list);
			});
		}
		else if (path.length == 2)
		{
			_db.query('SELECT DISTINCT(season_number), poster_file FROM Media WHERE series_tvdb_id = ' + path[1] + ' ORDER BY season_number').complete(function(err, res)
			{
				var list = res.map(function(e) { return { title : 'Season ' + e.season_number , id : e.season_number, thumb : e.poster_file }; });

				return cb(null, list);
			});

		}
		else if (path.length == 3)
		{
			_db.Media.findAll({where : { series_tvdb_id : path[1], season_number : path[2] }, order : 'episode_number'}).complete(function(err, res)
			{
				var list = res.map(function(e)
				{
					var item = {
						title : e.title,
						id : e.id,
						thumb : e.poster_file,
						media_id : e.id
					};

					if (e.season_number)
						item.html = 'Season ' + e.season_number + ', Episode ' + e.episode_number + '<br>Aired ' + _moment([e.airyear, e.airmonth - 1, e.airday]).fromNow();

					return item;

				});

				return cb(null, list);

			});
		}
	}
}

init();

module.exports = {
	getItems : getItems
};
