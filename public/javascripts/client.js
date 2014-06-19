$(function()
{
	$('#browse').on('pageshow', _browse.init);
	$('#player').on('pageshow', _player.init);
	$('#recent').on('pageshow', _recent.init);
	$('#new').on('pageshow', _new.init);

	_browse.init();
});

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
				a.append($('<img></img>').addClass('ui-li-thumb').attr('src', '/image/' + e.thumb + '?h=80'));

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
				_data = data.responseJSON;

				var cont = $('#browse ul[data-role="listview"]');

				function click(el)
				{
					_path = $(el.currentTarget).data('item').path;
					refresh;
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

	return {
		init : refresh
	};
})();

var _player = (function()
{
	var _playing;
	var _mode;

	function doAction(a)
	{
		$.ajax({url : '/api/player/' + a, complete: function(data)
		{
			_mode = data.responseJSON.mode;
			refresh();
		}});
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
		$('#btnFor1').click(function()
		{
			doAction('seek/1');
		});
		$('#btnFor10').click(function()
		{
			doAction('seek/10');
		});
		$('#btnBack1').click(function()
		{
			doAction('seek/-1');
		});
		$('#btnBack10').click(function()
		{
			doAction('seek/-10');
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


	return {
		init : refresh,
		startMedia : startMedia
	};
})();

var _recent = (function()
{
	function refresh()
	{

	}
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
				var cont = $('#browse ul[data-role="listview"]');

				addItemsToList(cont, data);
			}});

	}
	return {
		init : refresh
	};
})();


