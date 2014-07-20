var _conf = global.conf;

var _async = require('async');

var _logger = require('../logger');
var _helper = require('../helper');
var _md = require('../moviedata');
var _parse = require('../mediaparse');
var _db = require('../db');

var PAGE_LIMIT = 5;

function init()
{
}

function refresh(cbrefresh)
{
	return cbrefresh();

	if (_conf.update_only && (!_conf.update_only.nzbmovies))
		return cbrefresh();

	// Go back in time to either a) we find an entry we've seen already or b) we hit page limit

	var page = 1;
	function doit()
	{
		_helper.jqueryPage({
			url : 'https://omgwtfnzbs.org/browse.php?p=' + page + '&cat=16&sort=1&type=1',
			headers :
			{
				Cookie : 'cookname=' + _conf.omgwtfnzb_cookname + '; cookpass=' + _conf.omgwtfnzb_cookpass
			}}, function(err, $, bod)
		{
			if (err)
				return _logger.err(err);

			var rows = $('tr.nzbt_row');

			_async.eachSeries(rows, function(e, cb)
			{
				var $el = $(e);

				var title = $el.find('td.nzbt_name a.linky').attr('title');
				var link = 	'https://omgwtfnzbs.org/' + $el.find('img[src="pics/dload.gif"]').parent().attr('href');

				_db.Media.findOrCreate({ hash : link}, {type : 'MovieNZB', title : title, url : link, state : 'needsmetadata', hash : link}).complete(function(err, m, fCreated)
				{
					if (err)
						return cb(err);

					if (!fCreated)
						return cbrefresh();
					else
						return cb();
				});

			}, function(err)
			{
				if (err)
					return cbrefresh(err);

				page++;

				if (page > PAGE_LIMIT)
					return cbrefresh();

				process.nextTick(doit);
			});
		});
	}

	doit();

}

init();

module.exports = {
	refresh : refresh
};