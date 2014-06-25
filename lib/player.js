var _conf = global.conf;

var _spawn = require('child_process').spawn;
var _path = require('path');
var _util = require('util');
var _db = require('./db');
var _logger = require('./logger');
var _string = require('underscore.string');

var MODE_PLAYING = 'play';
var MODE_PAUSED = 'pause';
var MODE_STOPPED = 'stop';

var _mode = MODE_STOPPED;

var _plr;
var _file;
var _progress_sec;
var _length_sec;

var _events = new (require('events').EventEmitter)();
var _media;

var _keyqueue = [];

function queue_key(ch)
{
	_keyqueue.push(ch);

	if (_keyqueue.length > 1)
		return;

	function doit()
	{
		if (!_keyqueue.length)
			return;

		var facked = false;
		var next = _keyqueue.shift();

		function loop()
		{
			// console.log('sending... %s', next);
			try
			{
				_plr.stdin.write(next);
			}
			catch(ex)
			{
				process.nextTick(doit);
			}

			setTimeout(function()
			{
				if (facked)
					process.nextTick(doit);
				else
					process.nextTick(loop);
			}, 200);
		}

		_events.once('ack', function()
		{
			facked = true;
		});

		loop();
	}

	doit();
}

function send_key(ch)
{
    if (!_plr)
        return;

	queue_key(ch);
    //_plr.stdin.write(ch);
}

function dbg()
{
    if (!_conf.debug)
        return;

    console.log(_util.format.apply(null, arguments));
}

function startMedia(id)
{
	_db.Media.find({where : { id : id }}).complete(function(err, m)
	{
		_media = m;

		switch(m.type)
		{
			case 'Movie':
			case 'TV':
				play(m.abspath);
				break;
			case 'WebVideo':
				play(m.url);
				break;
		}

		m.last_play_date = Date.now();

		m.save();
	});
}

function play(file)
{

    if (!file)
    {
        return pause();
    }

    if (file != _file)
        stop();

    _file = file;

    dbg('Playing %s', file);

    _mode = MODE_PLAYING;

	var args = ['--input-terminal', '--quiet', '--ontop', '--lua=' + _path.join(process.cwd(), 'mpvslave.lua')];
	if (_conf.fullscreen)
		args.push('--fullscreen');

	args.push(file);

	_logger.info('Playing file %s', file);

    _plr = _spawn(_conf.mpv_command, args);

	_plr.stdout.on('data', function(d)
	{
		var text = d.toString();

		if (text.substr(0, 10) === '[mpvslave]')
		{
			var lines = text.split('\n');
			lines.forEach(function(l)
			{
				// Parse progress
				var parts = l.substr(11).split('/').map(function(e) { return _string.trim(e); });

				var cmd = parts[0];

				_events.emit(cmd, parts.slice(1));

			})
		}
	});

	_plr.on('error', function(err)
	{
	//	console.log(err);
	});
	_plr.on('close', function(err)
	{
	//	console.log(err);
	});

    return module.exports;
}

function stop()
{
    if (_mode === MODE_STOPPED)
        return module.exports;

	dbg('Stopping %s', _file);

	// Get status

	status(function()
	{
		_mode = MODE_STOPPED;

		send_key('-');
	});

    return module.exports;
}

function seek(amt)
{
	if (_mode == MODE_STOPPED)
		return;

	var map = {
		'1' : '!',
		'10' : '@',
		'-1' : '*',
		'-10' : '$',
		'start' : '^'
	};

	var key = map[amt];
	if (!key)
		return;

	dbg('Seeking %s', amt);

	send_key(key);
}

function mute()
{
	if (_mode == MODE_STOPPED)
		return;

	send_key(')');
}

function pause()
{
    if (_mode == MODE_PAUSED)
    {
        dbg('Unpausing %s', _file);
        _mode = MODE_PLAYING;
    }
    else if (_mode === MODE_PLAYING)
    {
        dbg('Pausing %s', _file);
        _mode = MODE_PAUSED;
    }
    else
        return;

    send_key('(');

    return module.exports;
}

function getMode()
{
	return _mode;
}

function status(cb)
{
	if (_mode === MODE_STOPPED)
	{
		return cb(null, { progress : _progress_sec, length : _length_sec });
	}
	else
	{
		_progress_sec = null;
		_length_sec = null;

		_events.once('status', function(parts)
		{
			_progress_sec = parseTime(parts[0]);
			_length_sec = parseTime(parts[1]);

			if (_media)
			{
				_media.last_play_progress_sec = _progress_sec;
				_media.duration_sec = _length_sec;

				_media.save();
			}

			function parseTime(t)
			{
				var parts = t.split(':');

				var h = parseInt(_string.trim(parts[0])) * 3600;
				var m = parseInt(_string.trim(parts[1])) * 60;
				var s = parseInt(_string.trim(parts[2]));

				return h + m + s;
			}

			cb(null, { progress : _progress_sec, length : _length_sec });
		});

		send_key('%');
	}
}


module.exports = {
    play : play,
    stop : stop,
    pause : pause,
	startMedia : startMedia,
	mode : getMode,
	seek : seek,
	mute : mute,
	status : status
};