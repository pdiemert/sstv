

var _player = (function()
{
	var _playing;
	var _mode = 'stop';
	var _active;


	function doAction(a)
	{
		$.ajax({url : '/api/player/' + a, complete: function(data)
		{
			setMode(data.responseJSON.mode);
		}});
	}

	function setMode(mode)
	{
		if (mode != _mode)
		{
			console.log('Going from %s to %s', _mode, mode);

			_mode = mode;

			switch(_mode)
			{
				case 'play':
					$.mobile.changePage('#player', { role : 'dialog' });
					$('#player').on('pagehide', handleHide);
					$('.btnPlayer').show();
					$('#player').trigger('playerStateChanged');
					break;
				case 'stop':
				case 'fail':
					$('#player').dialog('close');
					_active = false;
					$('.btnPlayer').hide();
					$('#player').trigger('playerStateChanged');
					break;
			}

			refresh();
		}
	}
	function monitor()
	{
//		if (!_active)
//			return;

		$.ajax({url : '/api/player/mode', complete: function(data)
		{
			setMode(data.responseJSON.mode);

			setTimeout(monitor, 1000);

		}});
	}

	function handleHide()
	{
		$('#player').off('pagehide', handleHide);
	}

	function startMedia(id)
	{
		_playing = id;

		if (!_active)
		{
			_active = true;

			monitor();
		}

		doAction('start/' + id);
	}

	function refresh()
	{
		$('#btnPlay td').text(_mode == 'play' ? 'Pause' : 'Play');
	}

	$(function()
	{
		$('#btnPlay').click(function()
		{
			doAction('play');
		});
		$('#btnStop').click(function()
		{
			doAction('stop');
		});
		$('#btnPause').click(function()
		{
			doAction('pause');
		});
		$('#btnFor10').click(function()
		{
			doAction('seek/10');
		});
		$('#btnBack10').click(function()
		{
			doAction('seek/-10');
		});
		$('#btnFor60').click(function()
		{
			doAction('seek/60');
		});
		$('#btnBack60').click(function()
		{
			doAction('seek/-60');
		});
		$('#btnFor600').click(function()
		{
			doAction('seek/600');
		});
		$('#btnBack600').click(function()
		{
			doAction('seek/-600');
		});
		$('#btnSeekStart').click(function()
		{
			doAction('seek/start');
		});
		$('#btnMute').click(function()
		{
			doAction('mute');
		});
		$('#btnAudioTrack').click(function()
		{
			doAction('caudio');
		});

		$('.btnPlayer').click(function()
		{
			$.mobile.changePage('#player', { role : 'dialog' });
		});
		$('.btnPlayer').hide();

	});

	$( document ).delegate("#player", "pagecreate", refresh);

	$(function()
	{
		$('#player').dialog();
		monitor();
	});

	return {
		startMedia : startMedia
	};
})();







