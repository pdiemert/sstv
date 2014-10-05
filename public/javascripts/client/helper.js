var _helper = (function()
{
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
				else if (e.type === 'Movie' || e.type === 'NZBMovie')
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

	return {
		addItemsToList : addItemsToList
	};
})();

