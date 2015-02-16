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
var MODE_FAILED = 'fail';

var _mode = MODE_STOPPED;

var _plr;
var _file;
var _progress_sec;
var _length_sec;
var _failed;

var _events = new (require('events').EventEmitter)();
var _media;

var _keyqueue = [];     // Each is { ch, [cb] }

function queue_key(ch, cb)
{
	_keyqueue.push({ ch : ch, cb : cb});

	if (_keyqueue.length > 1)
		return;

	function doit()
	{
		if (!_plr)
		{
			_keyqueue = [];
			return;
		}
		if (!_keyqueue.length)
			return;

		var facked = false;
		var next = _keyqueue.shift();

		function loop()
		{
			if (!_plr)
				return process.nextTick(doit);
			
			console.log('sending... %s', next.ch);
			try
			{
				_plr.stdin.write('script_binding "' + next.ch + '"\n');
			}
			catch(ex)
			{
				process.nextTick(doit);
			}

			setTimeout(function()
			{
				if (facked)
				{
					if (next.cb)
						next.cb();

					process.nextTick(doit);
				}
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

function send_key(ch, cb)
{
    if (!_plr)
        return;

	queue_key(ch, cb);
}

function dbg()
{
    if (!_conf.debug)
        return;

    console.log(_util.format.apply(null, arguments));
}

function startMedia(id, cb)
{
	_db.Media.find({where : { id : id }}).complete(function(err, m)
	{
		_media = m;

		switch(m.type)
		{
			case 'Movie':
			case 'TV':
				play(_path.join(_conf.media_dir, m.relpath));
				break;
			case 'WebVideo':
				play(m.url);
				break;
		}

		m.last_play_date = Date.now();

		m.save().complete(cb);
	});
}

function setMode(m)
{
	_mode = m;

	_events.emit('mode_' + m);

	//console.log('mode = %s', m);
}

function play(file)
{

    if (!file)
    {
        return pause();
    }

	function doplay()
	{
	    _file = file;

	    dbg('Playing %s', file);

	    setMode(MODE_PLAYING);

		var args = [
			'--audio-channels=' + _conf.audio_channels,
			'--quiet',
			'--input-terminal=no',
			'--input-file=/dev/stdin',
			'--ontop', 
			'--script=' + _path.join(process.cwd(), 'mpvslave.lua')];

		if (_conf.fullscreen)
			args.push('--fullscreen');

		args.push(file);

		_logger.info('Playing file %s', file);

		if (_conf.debug)
			console.log('Launching mpv with %s', args);
		
	    _plr = _spawn(_conf.mpv_command, args);

		_plr.stdout.on('data', function(d)
		{
			var text = d.toString();

			if (_conf.debug)
				console.log('MPV: %s', text);

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
			else if (text.indexOf('error') != -1)
			{
				_failed = true;
			}
		});

		_plr.on('error', function(err)
		{
		//	console.log(err);
		});
		_plr.on('close', function(err, code)
		{
			setMode(_failed ? MODE_FAILED : MODE_STOPPED);
			_failed = false;
			_plr = null;
		});
	}

	if (_file && file != _file)
		stop(doplay);
	else
		doplay();


	return module.exports;
}

function stop(cb)
{
    if (_mode === MODE_STOPPED || _mode === MODE_FAILED)
    {
	    if (cb)
	        cb();

        return module.exports;
    }

	dbg('Stopping %s', _file);

	// Get status

	status(function()
	{
		_file = null;

		if (cb)
			_events.once('mode_stop', cb);

		send_key('myquit');
	});

    return module.exports;
}

function seek(amt)
{
	if (_mode === MODE_STOPPED || _mode === MODE_FAILED)
		return;

	var map = {
		'10' : 'seek01',
		'-10' : 'seekb01',
		'60' : 'seek1',
		'-60' : 'seekb1',
		'600' : 'seek10',
		'-600' : 'seekb10',
		'start' : 'seekstart'
	};

	var key = map[amt];
	if (!key)
		return;

	dbg('Seeking %s', amt);

	send_key(key);
}

function mute()
{
	if (_mode === MODE_STOPPED || _mode === MODE_FAILED)
		return;

	send_key('cmute');
}

function cycleAudio()
{
	send_key('caudio');
}

function pause()
{
    if (_mode == MODE_PAUSED)
    {
        dbg('Unpausing %s', _file);
        setMode(MODE_PLAYING);
    }
    else if (_mode === MODE_PLAYING)
    {
        dbg('Pausing %s', _file);
	    setMode(MODE_PAUSED);
    }
    else
        return;

    send_key('cpause');

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
	else if (_mode === MODE_FAILED)
	{
		return cb(null, { progress : 0, length : 0 });
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

		send_key('stat');
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
	status : status,
	cycleAudio : cycleAudio
};