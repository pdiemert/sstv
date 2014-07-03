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

				_helper.addItemsToList(cont, _data, click, click);

				$('.btnBrowseBack').toggle(_path.length > 0);
				$('.btnHome').toggle(_path.length == 0);
			}});
	}


	$(function()
	{
		$('.btnBrowseBack').click(function()
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

