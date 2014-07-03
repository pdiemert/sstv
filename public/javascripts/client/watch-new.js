var _new = (function()
{
	function refresh()
	{
		$.ajax({
			url : '/api/new',
			complete: function(data, status)
			{
				var cont = $('#new ul[data-role="listview"]');

				_helper.addItemsToList(cont, data.responseJSON);
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
