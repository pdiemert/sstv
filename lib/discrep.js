var _util = require('util');
var _async = require('async');

var _db = require('./db');
var _logger = require('./logger');

function save(m, d, cb)
{
	_logger.err('Found discrepency for media ID #%d: %s', m.id, d.description);

	d.media_id = m.id;

	_async.series([
		function(cb)
		{

			_db.createOrUpdate(_db.Discrepancy, { hash : d.hash, type : d.type }, d, cb);
		},
		function(cb)
		{
			m.state = 'hasdiscrepancy';
			m.save().complete(cb);
		}
	], function(err)
	{
		if (err)
			return cb(err);


		return cb();
	});
}

function dupe(m, otherabs, fOtherIsDupe, cb)
{
	save(m,
	{
		type : 'duplicate',
			hash : m.hash,
		description : _util.format('Found duplicate media file "%s".  Original at "%s".', fOtherIsDupe ? otherabs : m.abspath, fOtherIsDupe ? m.abspath : otherabs),
		arg1 : otherabs,
		arg2 : fOtherIsDupe
	}, cb);
}

function noparse(m, cb)
{
	save(m, {
		type : 'noparse',
		hash : m.hash,
		description : _util.format('Unable to parse path "%s"', m.abspath),
		arg1 : m.abspath}, cb);
}

function notfound(m, title, type, detail, cb)
{
	save(m, {
		type : 'notfound',
		hash : m.hash,
		description : _util.format('Could not find "%s" in %s media database (%s)', title, type, detail),
		arg1 : title}, cb);
}

function ambiguous(m, title, type, cnt, cb)
{
	save(m, {
		type : 'ambiguous',
		hash : m.hash,
		description : _util.format('Too many possibilities for item "%s" (%d) in %s media database', title, cnt, type),
		arg1 : title}, cb);
}

module.exports = {
	dupe : dupe,
	noparse : noparse,
	notfound : notfound,
	ambiguous : ambiguous
};
