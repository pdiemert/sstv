var _path = require('path');
var _fs = require('fs');
var _async = require('async');


var _channels = [];

function init()
{
	var files = _fs.readdirSync(_path.join(__dirname, 'browse-channels'));

	files.forEach(function(f)
	{
		var path = _path.join(__dirname, 'browse-channels', f);

		var ch = require(path);

		_channels.push(ch);
	});
}

function getItems(path, cb)
{
	// If no path then grab all channels
	if (!path || !path.length)
	{
		_async.map(_channels, function(ch, cb)
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
			if (idx >= _channels.length)
			{
				return cb();
			}

			_channels[idx++].getItems(path, function(err,items)
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

init();

module.exports = {
	getItems : getItems
};