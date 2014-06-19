$(function()
{
	var w = $(window).width();
	var h = $(window).height();


	var d = $('<h1>SSTV</h1>').appendTo($('body')).css({position:'absolute', top:-10000, left:0});

	for(var fs = 100; d.width() < w && d.height() < h; fs++)
	{
		d.css({fontSize : fs+'px'});
	}

	d.css({top:0,position:'relative'});
});