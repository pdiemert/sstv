var _str = require('underscore.string');

// for properties, a suffix of:
//
//          '.' replaces '.' with ' ',
//          '#' parses as integer
var _parses =
	[
		{   // 0 /Volumes/c$/Media/TV/2 Broke Girls/2.Broke.Girls.S03E18.720p.HDTV.X264-DIMENSION/couple.of.poor.bitches.318.720p-dimension.sample.mkv

			regex : /.*(?:\.|-)sample\.(\w*)$/i,
			discard : true
		},
		{   // 1
			regex : /.*-s\.(\w*)$/i,
			discard : true
		},

		{   // 2 /Volumes/c$/Media/TV/Bizarre Foods/S06/Bizarre.Foods.S06E21.Sardinia.HDTV.XviD-MOMENTUM/sample-bizarre.foods.s06e21.hdtv.xvid-momentum.avi
			regex : /.*[\/|\\].*sample-.*\.(\w*)$/i,
			discard : true
		},

		{   // 3 /Volumes/c$/Media/Movies/Saving Private Ryan 1998 1080p BluRay AC3 x264 estres/Promo/Teaser.mp4
			regex : /.*[\/|\\]teaser\.(\w*)$/i,
			discard : true
		},

		{   // 4 /Volumes/c$/Media/Movies/Enemy 2013 1080p WEBRIP x264 AC3-EVE Read Nfo/Enemy.2013.1080p.WEBRIP.x264.AC3-EVE/Sample.mp4
			regex : /.*[\/|\\]sample\.(\w*)$/i,
			discard : true
		},
		{   // 5
			regex : /.*[\/|\\][^[\/|\\]\.]*[\/|\\]_UNPACK_(.*)\.S\d+E\d+.*[\/|\\].*S\d{1,3}E\d{1,3}.*\.\w*$/i,
			discard : true
		},
		{   // 6 /Volumes/c$/Media/TV/2 Broke Girls/2.Broke.Girls.S03E18.720p.HDTV.X264-DIMENSION/2.Broke.Girls.S03E18.720p.HDTV.X264-DIMENSION.mkv

			regex : /.*[\/|\\][^/\.]*[\/|\\](.*)\.S\d+E\d+.*[\/|\\].*S(\d{1,3})E(\d{1,3}).*\.(\w*)$/i,
			mediaType : 'TV',
			properties : ['series.', 'season#', 'episode#', 'ext']

		},
		{   // 7
			regex : /.*[\/|\\](.*)\.(\d{1,2})x(\d{1,3}).*\.(\w*)$/i,
			mediaType : 'TV',
			properties : ['series.', 'season#', 'episode#', 'ext']
		},

		{   // 8 /Volumes/c$/Media/TV/2 Broke Girls/2 Broke Girls - 3x15 - And the Icing on the Cake.mkv
			// /Volumes/c$/Media/TV/House of Cards (2013)/House of Cards (US) - 2x01 - Chapter 14.mkv

			regex : /.*[\/|\\]([^[\/|\\]]*(?: ?\(\d*\))?) +- *(\d{1,3})x(\d{1,3}).*\.(\w*)$/i,
			mediaType : 'TV',
			properties : ['series', 'season#', 'episode#', 'ext']
		},

		{   // 9 /Volumes/c$/Media/TV/Inside Comedy/Inside Comedy - S01E05 - Larry David.avi
			regex : /.*[\/|\\]([^[\/|\\]]*(?: ?\(\d*\))?) +- *S(\d{1,3})E(\d{1,3}).*\.(\w*)$/i,
			mediaType : 'TV',
			properties : ['series', 'season#', 'episode#', 'ext']
		},

		{   // 10 /Volumes/c$/Media/TV/60 Minutes/60.Minutes.AU.2013.10.27.One.Direction.PDTV.x264-FUtV/60.minutes.au.2013.10.27.one.direction.pdtv.x264-futv.mp4

			regex : /.*[\/|\\](.*)\.(\d\d\d\d)\.(\d{1,2})\.(\d\d{1,2}).*\.(\w*)$/i,
			mediaType : 'TV',
			usesAirTime : true,
			properties : ['series.', 'airyear#', 'airmonth#', 'airday#', 'ext']
		},

		{   // 11 /Volumes/c$/Media/TV/60 Minutes/60.Minutes.US.2014.01.26.Jay.Leno.HDTV.x264.mp4

			regex : /.*[\/|\\](.*)[\/|\\].*(\d\d\d\d)\.(\d{1,2})\.(\d{1,2}).*\.(\w*)$/i,
			mediaType : 'TV',
			usesAirTime : true,
			properties : ['series', 'airyear#', 'airmonth#', 'airday#', 'ext']
		},
		{   // 12 /Volumes/c$/Media/TV/House of Cards (2013)/House.of.Cards.2013.S01E12.720p.BluRay.x264-Green.mkv

			regex : /.*[\/|\\](.*)\.\d\d\d\d\.s(\d{1,3})e(\d{1,3}).*\.(\w*)$/i,
			mediaType : 'TV',
			properties : ['series.', 'season#', 'episode#', 'ext']
		},
		{   // 13 /Volumes/c$/Media/TV/Angry Boys/angry.boys.s01e04.720p.hdtv.x264-bia.mkv

			regex : /.*[\/|\\](?:[^-]*-)?(.*)\.s(\d{1,3})e(\d{1,3}).*\.(\w*)$/i,
			mediaType : 'TV',
			properties : ['series.', 'season#', 'episode#', 'ext']
		},
		{   // 14 /Volumes/c$/Media/TV/Little Britain/little.britain.s01.e01.ws.ac3.dvdrip.xvid-m00tv.avi

			regex : /.*[\/|\\](?:[^-]*-)?(.*)\.s(\d{1,3})\.e(\d{1,3}).*\.(\w*)$/i,
			mediaType : 'TV',
			properties : ['series.', 'season#', 'episode#', 'ext']
		},
		{
			// 15 /Volumes/c$/Media/TV/Monty Python's Flying Circus/MPFC-1.01.XviD.DVDRip.[rus.eng]_weconty.avi
			regex : /.*[\/|\\](.*)[\/|\\]\w\w\w\w-(\d{1,3})\.(\d{1,3}).*\.(\w*)$/i,
			mediaType : 'TV',
			properties : ['series', 'season#', 'episode#', 'ext']
		},

		{   // 16 /Volumes/c$/Media/Movies/Upside Down 2012 720p BRRip AC3 x264 MacGuffin/macguffin-upsdow720p/Upside Down 2012 720p BRRip AC3 x264 MacGuffin.mkv

			regex : /.*[\/|\\](.*) \((\d\d\d\d)\)[\/|\\][^[\/|\\]]*\.(\w*)$$/i,
			mediaType : 'Movie',
			properties : ['title', 'year', 'ext']
		},

		{   // 17 /Volumes/c$/Media/Movies/Saving Private Ryan 1998 1080p BluRay AC3 x264 estres/Saving Private Ryan (1998)(1080p)/Saving Private Ryan (1998).mkv

			regex : /.*[\/|\\](.*) *\((\d\d\d\d)\)\.(\w*)$/i,
			mediaType : 'Movie',
			properties : ['title', 'year', 'ext']
		},

		{   // 18 /Volumes/c$/Media/Movies/The.Secret.Life.of.Walter.Mitty.2013.720p.WEB-DL.DD5.1.H.264-PHD/The.Secret.Life.Of.Walter.Mitty.2013.720p.WEB-DL.DD5.1.H.264-PHD.mkv

			regex : /.*[\/|\\](?:_UNPACK_)?(?:.*-)?(.*)\.(\d\d\d\d)\..*\.(\w*)$/i,
			mediaType : 'Movie',
			properties : ['title.', 'year', 'ext']
		},

		{   // 19 /Volumes/c$/Media/Movies/The Jerk (1979) 720p/The Jerk (1979) 720p NL Subs/The Jerk (1979) 720p NL Subs.mkv

			regex : /.*[\/|\\](.*) \((\d\d\d\d)\) .*\.(\w*)$/i,
			mediaType : 'Movie',
			properties : ['title.', 'year', 'ext']
		},

		{   // 20 /Volumes/c$/Media/Movies/Wolf Children (2012)/Wolf Children.mkv

			regex : /.*[\/|\\](.*) \((\d\d\d\d)\)[\/|\\].*\.(\w*)$/i,
			mediaType : 'Movie',
			properties : ['title.', 'year', 'ext']
		},

		{   // 21 /Volumes/c$/Media/Movies/Upside Down 2012 720p BRRip AC3 x264 MacGuffin/macguffin-upsdow720p/Upside Down 2012 720p BRRip AC3 x264 MacGuffin.mkv

			regex : /.*[\/|\\](.*) (\d\d\d\d) .*\.(\w*)$/i,
			mediaType : 'Movie',
			properties : ['title.', 'year', 'ext']
		},
		{   // 22 /Volumes/c$/Media/Movies/Louis C.K. Oh.My.God.720p.HDTV.x264.AC3-Riding High.mkv

			regex : /.*[\/|\\](.*)\.(?:720p|1080p)\..*\.(\w*)$/i,
			mediaType : 'Movie',
			properties : ['title.', 'ext']
		},

		{   // 23 Volumes/c$/Media/Movies/A Journey to Planet Sanity (HD).mkv

			regex : /.*[\/|\\](.*)(?:-.*)\.(\w*)$/i,
			mediaType : 'Movie',
			properties : ['title.', 'ext']
		},
	];

/***
 * Returns null if file can be discarded, undefined if no pattern matched (oops), or an info object with relevant properties
 * @param f
 * @returns {*}
 */
function parseFilename(f)
{
	// Find first match, assign properties and type
	for(var i = 0; i < _parses.length; i++)
	{
		var p = _parses[i];

		var m = f.match(p.regex);

		if (m && m.length > 1)
		{
			if (p.discard)
				return null;

			var o = { parseIdx : i, type : p.mediaType, usesAirTime : !!p.usesAirTime };

			p.properties.forEach(function(n, i)
			{
				var v = m[i+1];
				if (_str.endsWith(n, '#'))
				{
					n = n.substr(0, n.length-1);
					v = parseInt(v);
				}
				else if (_str.endsWith(n, '.'))
				{
					n = n.substr(0, n.length-1);
					v = v.replace(/\./g, ' ');
				}

				o[n] = _str.trim(v).replace('_', ' ');
			});

			return o;
		}
	}

	return undefined;
}

module.exports = {
	parse : parseFilename
};