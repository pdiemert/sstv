var _conf = global.conf;

var _async = require('async');
var _str = require('underscore.string');

var _logger = require('../logger');
var _helper = require('../helper');
var _md = require('../moviedata');
var _parse = require('../nzbnameparse');
var _db = require('../db');

var PAGE_LIMIT = 5;

function init()
{
}

var KILOBYTE = 1024;
var MEGABYTE = 1024 * 1024;
var GIGABYTE = 1024 * 1024 * 1024;

function parseSize(sz)
{
	var parts = sz.split(' ');
	var c = parseFloat(sz[0]);
	if (parts.length == 1)
		return c;

	switch(parts[1])
	{
		case 'GB':
			return c * GIGABYTE;
		case 'MB':
			return c * MEGABYTE;
		case 'KB':
			return c * KILOBYTE;
		default:
			return null;
	}
}

function refresh(cbrefresh)
{
	if (_conf.update_only && (!_conf.update_only.nzbmovies))
		return cbrefresh();

	// Go back in time to either a) we find an entry we've seen already or b) we hit page limit

	var page = 1;
	function doit()
	{
		_logger.info('Downloading NZB movies page #' + page);

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

			var fFoundExisting = false;

			_async.eachSeries(rows, function(e, cb)
			{
				var $el = $(e);

				var title = $el.find('td.nzbt_name a.linky').attr('title');
				var link = 	'https://omgwtfnzbs.org/' + $el.find('img[src="pics/dload.gif"]').parent().attr('href');
				var imdblink = 	$el.find('img[src="pics/link.gif"]').attr('title');
				var imdb_id;
				if (imdblink)
				{
					var parts = imdblink.split('/');
					imdb_id = parts[parts.length-2];
				}

				var sm = $el.text().match(/.*Size: (.* .*).*$/im);

				var size;

				if (!sm || !sm.length == 2 || !(size = parseSize(sm[1])))
				{
					_logger.err('Unable to parse nzb for size: %s', title);
					return cb();
				}

				var info = _parse.parse(title);

				if (!info)
				{
					_logger.err('Unable to parse nzb name: %s', title);
					return cb();
				}

				// See if we've already got this variation
				var vhash = _str.slugify('nzbvar_' + info.title + '_' + info.year + '_' + info.resolution + '_' + info.group);

				_db.Media.find({ where : { hash : vhash}}).complete(function(err, m)
				{
					if (m)
					{
						// Found an existing to punt
						fFoundExisting = true;
						return cb();
					}

					var parent;
					var hash = _str.slugify('nzb_' + info.title + '_' + info.year);

					// If no existing movie, find the NZBMovie or create it
					_db.Media.findOrCreate({ title : info.title, year : info.year }, {type : 'NZBMovie', title : info.title, year : info.year, imdb_id : imdb_id, state : 'needsmetadata' }).complete(function(err, m, fCreated)
					{
						if (err)
							return cb(err);

						// Now create variation
						_db.Media.create({
							hash : vhash,
							type : 'NZBVariation',
							title : info.title,
							year : info.year,
							group : info.group,
							imdb_id : imdb_id,
							resolution : info.resolution,
							size : size,
							state : 'readytodownload',
							url : link,
							variation_of_id : m.id}).complete(cb);
					});

				});


			}, function(err)
			{
				if (err)
					return cbrefresh(err);
				else if (fFoundExisting)
					return cbrefresh();

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