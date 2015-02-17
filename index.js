process.on('uncaughtException', function(err)
{
	console.log(err.stack);
	process.exit(0);
});

var _conf = global.conf = require('./config.json');

var _applescript = require('applescript');
var _pkg = require('./package.json');
var _logger = require('./lib/logger');
var _helper = require('./lib/helper');
var _watchers = require('./lib/watchers');
var _db = require('./lib/db');

_logger.info('SSTV v%s using Node %s', _pkg.version, process.version);


var _opt = require('optimist');

var _argv = _opt
	.usage('A stupid simple home media center')
	.options('w', { alias : 'webvideo', describe : 'only update the web video source specified' })
	.options('o', { alias : 'nzbmovies', describe : 'only update the NZB movies available' })
	.options('n', { alias : 'noupdate', describe : 'do not update watched sources' })
	.options('!', { alias : 'wipe', describe : 'wipes the database on startup' })
	.options('h', { alias : 'help', describe : 'show this message' })
	.argv;

if (_argv.help)
{
	_opt.showHelp();
	process.exit(0);
}

if (_argv.wipe)
{
	_conf.wipe_db = true;
	_logger.info('Wiping database');
}

if (_argv.webvideo)
{
	if (!_conf.update_only)
		_conf.update_only = {};

	_conf.update_only.webvideo = _argv.webvideo;
	_logger.info('Only updating webvideo %s', _argv.webvideo);
}

if (_argv.nzbmovies)
{
	if (!_conf.update_only)
		_conf.update_only = {};

	_conf.update_only.nzbmovies = true;

	_logger.info('Only updating NZB movies');
}

if (_argv.noupdate)
{
	if (!_conf.update_only)
		_conf.update_only = {};

	_logger.info('No updating any watched sources');
}

var app = require('./app');

app.set('port', _conf.port || process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
	_logger.info('Listening on port ' + server.address().port);

	if (_conf.desktop_overlay)
	{
		_applescript.execFile('desktop.scpt', function(err, rtn)
		{

		});
	}

	_watchers.load();

	if (_conf.refresh_on_start)
	{
		_db.on('ready', function()
		{
			_watchers.refresh();
		});
	}
});

