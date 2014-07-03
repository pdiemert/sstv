var _recent = (function()
{
	function refresh()
	{
		$.ajax({
			url : '/api/recent',
			complete: function(data, status)
			{
				var cont = $('#recent ul[data-role="listview"]');

				_helper.addItemsToList(cont, data.responseJSON);
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
