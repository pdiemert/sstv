var _new = (function()
{
	var _path = '';
	var _data;


	function refresh()
	{

		$.ajax({
			url : '/api/new' + _path,
			complete: function(data, status)
			{
				_data = JSON.parse(data.responseText);

				var cont = $('#new ul[data-role="listview"]');

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

				$('.btnNewBack').toggle(_path.length > 0);
				$('.btnHome').toggle(_path.length == 0);
			}});
		
		
		
/*		
		$.ajax({
			url : '/api/new',
			complete: function(data, status)
			{
				var cont = $('#new ul[data-role="listview"]');

				_helper.addItemsToList(cont, data.responseJSON);
			}});
			*/
	}

	$( document ).delegate("#new", "pagecreate", refresh);
	$(function()
	{
		$('.btnNewBack').click(function()
		{
			_path = _path.substr(0, _path.lastIndexOf('/'));

			refresh();
		});
		
		$('#new ul[data-role="listview"]').listview();

		$('#player').on('playerStateChanged', refresh);
	});

	return {
	};
})();
