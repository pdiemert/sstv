var _path = require('path');
var _fs = require('fs');
var _async = require('async');


var _channels = {};

function addDir(dirpath, name)
{
	if (_channels[name])
		return;

	_channels[name] = [];

	var files = _fs.readdirSync(_path.join(__dirname, dirpath));

	files.forEach(function(f)
	{
		var path = _path.join(__dirname, dirpath, f);

		var ch = require(path);

		_channels[name].push(ch);
	});
}

function getItems(name, path, cb)
{
	var chset = _channels[name];

	// If no path then grab all channels
	if (!path || !path.length)
	{
		_async.map(chset, function(ch, cb)
		{
			ch.getItems(null, cb);

		}, function(err, items)
		{

			if (items && items.length)
			{
				for(var i=1; i < items.length; i++)
					items[0] = items[0].concat(items[i]);
			}
			return cb(err, items[0]);
		});
	}
	else
	{
		// Find first channel that returns a lest
		var idx = 0;
		function doit()
		{
			if (idx >= chset.length)
			{
				return cb();
			}

			chset[idx++].getItems(path, function(err,items)
			{
				if (err)
					return cb(err);

				if (items == null)
					return process.nextTick(doit);

				return cb(null, items);
			});

		}

		doit();
	}
}

module.exports = {
	addDir : addDir,
	getItems : getItems
};