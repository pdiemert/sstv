var _conf = global.conf;

var _path = require('path');
var _db = require('../db');
var _helper = require('../helper');

function init()
{
}

function getItems(path, cb)
{
	if (!path)
	{
		_db.Media.count({
			where : {
				state : 'ready',
				type : 'WebVideo',
				last_play_date : null
			}
		}).complete(function (err, c) {
			return cb(null, [{
				type : 'Section',
				title : 'Web Videos (' + c + ')',
				id : 'webvids'
			}]);
		});

		return;
	}
	else if (path[0] !== 'webvids')
		return cb(null, null);
	else
	{
		if (path.length == 1)
		{
			_db.query("select source_name, count(source_name) as c from media where type = 'WebVideo' and last_play_date IS NULL group by source_name").complete(function (err, res) {
				var list = res.map(function (e) {
					return {
						type : 'Section',
						title : e.source_name + ' (' + e.c + ')',
						id : e.source_name
					};
				});

				return cb(null, list);
			});
		}
		else if (path.length == 2)
		{
			_db.Media.findAll({ where : { state : 'ready', type : 'WebVideo', source_name : path[1], last_play_date : null }, order : 'createdAt'}).complete(cb);
		}
		
	}
}

init();

module.exports = {
	getItems : getItems
}

