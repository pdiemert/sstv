

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

					if (id)
						return _player.startMedia(id);

					if (click)
						click(el);
				})
				.appendTo(li);

			if (e.media_id)
			{
				a.data('media_id', e.media_id);
				$('<a></a>')
					.click(function(el)
					{
						var id = $(el.currentTarget).data('media_id');

						if (id)
							return _player.startMedia(id);

						if (mediaClick)
							mediaClick(el);
					})
					.appendTo(li);
			}

			if (e.thumb)
				a.append($('<img></img>').addClass('ui-li-thumb').attr('src', e.thumb + '?h=80'));

			a.append($('<h3></h3>').addClass('ui-li-heading').text(e.title));

			if (e.text)
				$('<p></p>').text(e.text).appendTo(a);
			if (e.html)
				$('<p></p>').html(e.html).appendTo(a);


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

				$('#browse div[data-role="header"] a').toggle(_path.length > 0);
			}});
	}


	$(function()
	{
		$('#back').click(function()
		{
			_path = _path.substr(0, _path.lastIndexOf('/'));

			refresh();
		});

	});

	$( document ).delegate("#browse", "pagecreate", refresh);

	return {
	};
})();

var _player = (function()
{
	var _playing;
	var _mode;
	var _last;

	function doAction(a)
	{
		$.ajax({url : '/api/player/' + a, complete: function(data)
		{
			_mode = data.responseJSON.mode;

			/*
			if (m != _last)
			{
				switch(_mode)
				{
					case 'play':
						//$.mobile.activePage.attr('id')
						break;
					case 'stop':
					case 'fail':
						if (_playing)
						{
							_playing = null;
							$.mobile.back();
						}
						break;
				}

				_mode = m;
			}

			_last = m;
			*/

			refresh();
		}});
	}

	function monitor()
	{
		doAction('mode');
	}

	function startMedia(id)
	{
		_playing = id;

		$.mobile.changePage('#player');

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
	});

	$( document ).delegate("#player", "pagecreate", refresh);

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

	return {
	};
})();





