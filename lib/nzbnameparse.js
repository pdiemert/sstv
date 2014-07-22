var _helper = require('./helper');

var _parses =
	[
		{
			regex : /(.*)\.(\d\d\d\d)\.([^.]*)\..*[-|\.](.*)$/i,
			properties : { type : 'MovieNZB'},
			matchNames : ['title.', 'year', 'resolution', 'group']
		},
		{
			regex : /(.*) (\d\d\d\d) (.*) .* .*-(.*)$/i,
			properties : { type : 'MovieNZB'},
			matchNames : ['title.', 'year', 'resolution', 'group']
		},
		{
			regex : /(.*) \((.*)\) (.*)-(.*)$/i,
			properties : { type : 'MovieNZB'},
			matchNames : ['title', 'year', 'resolution', 'group']
		},
		{
			regex : /(.*) \((.*)\) (.*)$/i,
			properties : { type : 'MovieNZB'},
			matchNames : ['title', 'year', 'resolution']
		}
	];

function parse(nzb)
{
	return _helper.findPattern(_parses, nzb);
}

module.exports = {
	parse : parse
};
