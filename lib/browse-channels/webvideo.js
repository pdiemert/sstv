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
		return cb (null, [{type : 'Section', title : 'Web Videos', id : 'webvids'}]);
	}
	else if (path[0] !== 'webvids')
		return cb(null, null);
	else
	{
		_db.Media.findAll({ where : { state : 'ready', type : 'WebVideo' }, order : 'source_name'}).complete(cb);
	}
}

init();

module.exports = {
	getItems : getItems
}

