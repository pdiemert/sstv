var _conf = global.conf;

var _dir = require('node-dir');
var _path = require('path');
var _crypto = require('crypto');
var _fs = require('fs');
var _request = require('request');
var _cheerio = require('cheerio');
var _ = require('underscore');
var _str = require('underscore.string');

var _logger = require('./logger');
var _db = require('./db');

function dirScan(path, cb)
{
	_dir.paths(path, function(err, paths)
	{
		if (err)
			return cb(err);

		cb(null, paths.files);
	});
}

/**
 * Get the file hash for a video file. The file must be larger than 4MB.
 * (Uses the shooter.cn video hash algorithm)
 * @param {string} fileName, the file path
 * @param {function(err, string)=} callback, return the hash string of the file
 */
function hashVideoFile(fileName, callback)
{
	fileName = _path.normalize(fileName);
	var hash = '';
	_fs.open(fileName, 'r', function (err, fd)
	{
		_fs.fstat(fd, function (err, stats)
		{
			if (err)
			{
				callback(err);
				return;
			}
			function finish(err, hash)
			{
				_fs.close(fd, function()
				{
					return callback(err, hash);
				});
			}

			var fileLength = stats.size;
			if (fileLength < 8192)
			{
				return finish(new Error('file too small'));
			}
			var offsets = [4096, fileLength / 3 * 2, fileLength / 3, fileLength - 8192];
			var buffers = [], count = 0;
			var calculateHash = function ()
			{
				for (var i = 0; i < buffers.length; i++)
				{
					if (hash)
					{
						hash += ';';
					}
					hash += _crypto.createHash('md5').update(buffers[i]).digest('hex');
				}
			}
			for (var i = 0; i < offsets.length; i++)
			{
				buffers[i] = new Buffer(4096);
				_fs.read(fd, buffers[i], 0, 4096, offsets[i], function (err, bytesRead, buffer)
				{
					if (err || bytesRead < 4096)
					{
						return finish(err || new Error('bytes too small'));;
					}
					count++;
					if (count == 4)
					{
						calculateHash();
						return finish(null, hash);
					}
				});
			}
		});
	});
}

function cache(fnc)
{
	var _fnc = fnc;
	var _cache = {};

	return function()
	{
		var args = Array.prototype.slice.call(arguments, 0);

		var params = args.slice(0, args.length - 1);

		var key = params.join(':');

		if (key in _cache)
			return args[args.length-1](null, _cache[key]);

//		console.log('No cache item for %s ( %s )', _fnc.name, key);

		params.push(function(err, res)
		{
			_cache[key] = res;

//			console.log('got %j for %s', res, key);

			return args[args.length-1](null, res);
		});

		_fnc.apply(null, params);
	}
}

function jqueryPage(opt, cb)
{

	_request(opt, function(err,res,bod)
	{
		if (err)
			return cb(err);
		try
		{
			var $ = _cheerio.load(bod);
		}
		catch(ex)
		{
			var err = new Error('Unexpected error parsing page ' + JSON.stringify(opt)  + ', ' + ex.message);
			return cb(err);
		}

		return cb(null, $, bod);
	});
}

function imagePath(filename)
{
	return _path.join(process.cwd(), 'public', _conf.image_dir, filename);
}

function downloadImage(url, filename, title, cb)
{
	var target = _path.join(process.cwd(), 'public', _conf.image_dir, filename);

	// Don't download if we've already got it
	if (_fs.existsSync(target))
		return cb();

	_logger.info('Downloading %s', title);


	_request.head(url, function(err, res, body)
	{
		if (err)
			_logger.err('Unexpected error downloading image %s: %s', url, err);

		_request(url).pipe(_fs.createWriteStream(target)).on('close', cb);
	});

}

function imageHash(title, year, series)
{
	var hash = _crypto.createHash('sha1');

	var str = title + ':' + year;
	if (series)
		str += series;

	return hash.update(str).digest('hex');
}

/***
 *  Returns null if file can be discarded, undefined if no pattern matched (oops), or an info object with relevant properties
 *
 * @param parses            Array, in priority order, of parse information objects
 *
 *                              regex               Regex to match with groups
 *                              discard             If true, this is a non-interesting text, return null
 *                              properties          Properties to copy to info on success
 *                              matchNames          Names, in order, of match groups, added to info on success
 *                                                  for matchNames, a suffix of:
 *                                                      '.' replaces '.' with ' '
 *                                                      '#' parses as integer
 *
 * @param text
 * @returns {*}
 */
function findPattern(parses, text)
{
	// Find first match, assign properties
	for(var i = 0; i < parses.length; i++)
	{
		var p = parses[i];

		var m = text.match(p.regex);

		if (m && m.length > 1)
		{
			if (p.discard)
				return null;

			var o = { parseIdx : i };

			for(var prop in p.properties)
				o[prop] = p.properties[prop];

			p.matchNames.forEach(function(n, i)
			{
				var v = m[i+1];
				if (_str.endsWith(n, '#'))
				{
					n = n.substr(0, n.length-1);
					v = parseInt(v);
				}
				else if (_str.endsWith(n, '.'))
				{
					n = n.substr(0, n.length-1);
					v = v.replace(/\./g, ' ');
				}

				o[n] = _str.trim(v).replace('_', ' ');
			});

			return o;
		}
	}

	return undefined;
}


module.exports = {
	dirScan : dirScan,
	hashVideoFile : hashVideoFile,
	cache : cache,
	jqueryPage : jqueryPage,
	downloadImage : downloadImage,
	imagePath : imagePath,
	imageHash : imageHash,
	findPattern : findPattern
};