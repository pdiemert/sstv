var _conf = global.conf;

var _dir = require('node-dir');
var _path = require('path');
var _fs = require('fs');
var _crypto = require('crypto');
var _fs = require('fs');
var _request = require('request');
var _cheerio = require('cheerio');
var _mtd = require('mt-downloader');


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

function jqueryPage(url, cb)
{
	_request(url,function(err,res,bod)
	{
		var $ = _cheerio.load(bod);

		if (err)
			return cb(err);

		return cb(null, $, bod);
	});
}

function imagePath(filename)
{
	return _path.join(process.cwd(), 'public', _conf.image_dir, filename);
}

function downloadImage(url, filename, cb)
{
	var target = _path.join(process.cwd(), 'public', _conf.image_dir, filename);

	// Don't download if we've already got it
	if (_fs.existsSync(target))
		return cb();


	_request.head(url, function(err, res, body)
	{
		if (err)
			_logger.err('Unexpected error downloading image %s: %s', url, err);

		_request(url).pipe(_fs.createWriteStream(target)).on('close', cb);
	});

	/*

	var downloader = new _mtd(target, url, { onEnd : cb });

	downloader.start();
	*/

}

function loadWatchers()
{
	var files = _fs.readdirSync(_path.join(__dirname, 'watchers'));

	files.forEach(function(f)
	{
		var path = _path.join(__dirname, 'watchers', f);

		require(path);
	});

}


module.exports = {
	dirScan : dirScan,
	hashVideoFile : hashVideoFile,
	cache : cache,
	jqueryPage : jqueryPage,
	loadWatchers : loadWatchers,
	downloadImage : downloadImage,
	imagePath : imagePath
};