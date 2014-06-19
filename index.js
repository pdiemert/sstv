process.on('uncaughtException', function(err)
{
	console.log(err.stack);
	process.exit(0);
});

var _applescript = require('applescript');
var _conf = global.conf = require('./config.json');
var _pkg = require('./package.json');
var _logger = require('./lib/logger');

_logger.info('SSTV v%s using Node v%s', _pkg.version, process.version);

if (process.argv[2] == 'wipe')
{
	_conf.wipe_db = true;
	_logger.info('Wiping database');
}

var app = require('./app');

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
	_logger.info('Listening on port ' + server.address().port);

	if (_conf.desktop_overlay)
	{
		_applescript.execFile('desktop.scpt', function(err, rtn)
		{

		});
	}
});

