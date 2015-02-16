var _more = (function()
{

	function updateStatus()
	{
		$.ajax({url : '/api/status', complete: function(data)
		{
			if (data && data.responseJSON)
				$('#status').text(data.responseJSON.status);

			setTimeout(updateStatus, 2000);
		}});
	}

	$(function()
	{
		$('#btnRefresh').click(function()
		{
			$.ajax({url : '/api/refresh', complete: function(data)
			{
				setMode(data.responseJSON.mode);
			}});
		});

		updateStatus();
	});

	return {
	};
})();
