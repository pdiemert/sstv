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
		_db.Media.count({
			where : {
				state : 'ready',
				type : 'TV',
				last_play_date : null
			}
		}).complete(function (err, c) {
			return cb(null, [{
				type : 'Section',
				title : 'TV (' + c + ')',
				id : 'tv'
			}]);
		});

		return;
	}
	else if (path[0] !== 'tv')
		return cb(null, null);
	else
	{
		_db.Media.findAll({ where : { state : 'ready', type : 'TV', last_play_date : null }, order : 'title'}).complete(cb);
	}
}

init();

module.exports = {
	getItems : getItems
};
