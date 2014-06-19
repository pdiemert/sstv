var _conf = global.conf;

var _fs = require('fs');
var _util = require('util');
var _path = require('path');
var _express = require('express');
var _router = _express.Router();
var _gm = require('gm');

_router.get('/:image', function(req, res)
{
	var w = req.query.w || null;
	var h = req.query.h || null;

	var base = req.params.image.substr(0, req.params.image.lastIndexOf('.'));
	var ext = req.params.image.substr(req.params.image.lastIndexOf('.')+1);

	var source = _path.join(process.cwd(), 'public', _conf.image_dir, req.params.image);

	var name = base;
	if (w)
		name += '_w' + w;
	if (h)
		name += '_h' + h;

	name += '.' + ext;

	var target = _path.join(process.cwd(), 'public', _conf.image_dir, name);

	var rel = '/' + _path.join(_conf.image_dir, name);

	if (_fs.existsSync(target))
		return res.redirect(rel);

	// Size does not exist, create
	_gm(source).resize(w, h).write(target, function(err)
	{
		res.redirect(rel);
	});

});

module.exports = _router;
