

function addItemsToList(cont, items, click, mediaClick)
{
	cont.children().remove();

	if (items)
	{
		items.forEach(function(e)
		{
			var li = $('<li></li>');

			var a = $('<a></a>')
				.addClass('ui-link-inherit')
				.data('item', e)
				.click(function(el)
				{
					var id = $(el.currentTarget).data('media_id');

					if (id && e.type != 'Section')
						return _player.startMedia(id);

					if (click)
						click(el);
				})
				.appendTo(li);

			var html = '';

			if (e.id)
			{
				a.data('media_id', e.id);
			}


			if (e.thumb_path)
				a.append($('<img></img>').addClass('ui-li-thumb').attr('src', e.thumb_path + '?h=80'));

			if (e.type === 'Section')
			{
				a.append($('<h3></h3>').addClass('ui-li-heading').text(e.title));
			}
			else if (e.type === 'TV')
			{
				a.append($('<h3></h3>').addClass('ui-li-heading').text(e.series));

				if (e.title)
				{
					html += e.title;
					if (e.season_number)
						html += '&nbsp;/ S' + e.season_number + 'xE' + e.episode_number;
				}
				else
				{
					if (e.season_number)
						html = 'Season ' + e.season_number + ', Episode ' + e.episode_number;
				}

				if (e.airyear && e.airmonth && e.airday)
				{
					if (html.length)
						html += '<br>';
					html += 'Aired ' + e.airago;
				}

			}
			else if (e.type === 'Movie')
			{
				a.append($('<h3></h3>').addClass('ui-li-heading').text(e.title + ' (' + e.year + ')'));

				if (e.rating)
				{
					for(var i=0; i < e.rating; i++)
					{
						html += '★'; /*e.rating >= (i+1) ? : '☆'*/ ;
					}

					html += '&nbsp;- ' + e.rating + ' / 10<br>' + e.votes + ' votes';
				}

			}
			else if (e.type === 'WebVideo')
			{
				var title = e.source_name;
				if (e.channel_name)
					title += ' - ' + e.channel_name;

				a.append($('<h3></h3>').addClass('ui-li-heading').text(title));

				html = e.title;
			}

			if (e.last_play_progress_sec)
			{
				html += '&nbsp;/ ';

				var perc = (e.last_play_progress_sec / e.duration_sec) * 10;
				for(var i=0; i < 10; i++)
					html += i < perc ? ':' : '.';

				var remain = e.duration_sec - e.last_play_progress_sec;

				var txt;
				if (remain > 3600)
				{
					txt = Math.floor(remain / 3600) + 'h ' + Math.floor((remain % 3600) / 60) + 'm left';
				}
				else
					txt = Math.floor(remain / 60) + 'm left';

				html += '&nbsp;' + txt;

			}

			$('<p></p>').html(html).appendTo(a);

			li.appendTo(cont);
		});
	}

	cont.listview('refresh');

}
// Browse
var _browse = (function()
{

	var _path = '';
	var _data;


	function refresh()
	{
		$.ajax({
			url : '/api/browse' + _path,
			complete: function(data, status)
			{
				_data = JSON.parse(data.responseText);

				var cont = $('#browse ul[data-role="listview"]');

				function click(el)
				{
					_path = $(el.currentTarget).data('item').path;
					refresh();
				}

				_data.forEach(function(e)
				{
					e.path = _path + '/' + e.id;
				});

				addItemsToList(cont, _data, click, click);

				$('#btnBrowseBack').toggle(_path.length > 0);
			}});
	}


	$(function()
	{
		$('#btnBrowseBack').click(function()
		{
			_path = _path.substr(0, _path.lastIndexOf('/'));

			refresh();
		});

		$('#player').on('playerStateChanged', refresh);

		$('#browse ul[data-role="listview"]').listview();

	});

	$( document ).delegate("#browse", "pagecreate", refresh);

	return {
	};
})();

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
		if (!_active)
			return;

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
		$('#btnPlay').text(_mode == 'play' ? 'Pause' : 'Play');
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
	});

	return {
		startMedia : startMedia
	};
})();

var _recent = (function()
{
	function refresh()
	{
		$.ajax({
			url : '/api/recent',
			complete: function(data, status)
			{
				var cont = $('#recent ul[data-role="listview"]');

				addItemsToList(cont, data.responseJSON);
			}});

	}

	$( document ).delegate("#recent", "pagecreate", refresh);
	$(function()
	{
		$('#recent ul[data-role="listview"]').listview();

		$('#player').on('playerStateChanged', refresh);
	});

	return {
		init : refresh
	};
})();

var _new = (function()
{
	function refresh()
	{
		$.ajax({
			url : '/api/new',
			complete: function(data, status)
			{
				var cont = $('#new ul[data-role="listview"]');

				addItemsToList(cont, data.responseJSON);
			}});
	}

	$( document ).delegate("#new", "pagecreate", refresh);
	$(function()
	{
		$('#new ul[data-role="listview"]').listview();

		$('#player').on('playerStateChanged', refresh);
	});

	return {
	};
})();





