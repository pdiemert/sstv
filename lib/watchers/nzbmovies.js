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

function refresh(cb)
{
	return cb();

	// Go back in time to either a) we find an entry we've seen already or b) we hit page limit
	var page = 1;
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
			var link = 	$el.find('img[src="pics/dload.gif"]').parent().attr('href');

			var info = _parse.parseNZB(title);

			if (!info)
			{
				_logger.err('Unable to parse "%s", discarding', title);
				return cb();
			}
			else
			{
				var m = _db.Media.build();

				_md.findMovieMetadataFromName(m, info, function(err)
				{
					if (err)
						return cb(err);

					m.type = 'MovieNZB';
					m.url = 'https://omgwtfnzbs.org/' + link;


					m.save().complete(cb);
				});
			}

		}, function(){})

	});

}

init();

module.exports = {
	refresh : refresh
};