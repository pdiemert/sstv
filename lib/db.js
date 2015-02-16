var _conf = global.conf;

var EventEmitter = require('events').EventEmitter;

var _logger = require('./logger');
var _string = require('underscore.string');
var Sequelize = require('sequelize');
//var _sqlz = new Sequelize('sstv', 'sstv', 'sstv', { dialect : 'mysql', logging : false });
var _sqlz = new Sequelize('data.sqlite', 'sstv', 'sstv', { dialect : 'sqlite', storage : 'data.sqlite', logging : false });

var _modelSchema = {

	Media : {
		hash: { type : Sequelize.STRING, unique : true },
		relpath: Sequelize.STRING,
		abspath: Sequelize.STRING,
		state : { type: Sequelize.ENUM, values : ['needsmetadata', 'ready', 'readytodownload', 'hasdiscrepancy', 'discarded'] },
		type : { type: Sequelize.ENUM, values : ['Movie', 'TV', 'WebVideo', 'FolderItem', 'NZBMovie', 'NZBVariation'] },
		title : Sequelize.STRING,
		year : Sequelize.INTEGER,
		description : Sequelize.TEXT,
		genres : Sequelize.STRING,
		country : Sequelize.STRING,
		votes : Sequelize.INTEGER,
		rating : Sequelize.FLOAT,
		moviedb_id : Sequelize.STRING,
		tvdb_id : Sequelize.STRING,
		imdb_id : Sequelize.STRING,
		series_tvdb_id : Sequelize.STRING,
		uses_air_time : Sequelize.BOOLEAN,
		series : Sequelize.STRING,
		airyear : Sequelize.INTEGER,
		airmonth : Sequelize.INTEGER,
		airday : Sequelize.INTEGER,
		season_number : Sequelize.INTEGER,
		episode_number : Sequelize.INTEGER,
		poster_file : Sequelize.STRING,
		backdrop_file : Sequelize.STRING,
		banner_file : Sequelize.STRING,
		ext : Sequelize.STRING,
		filedate : Sequelize.DATE,
		last_play_date : Sequelize.DATE,
		last_play_progress_sec : Sequelize.INTEGER,
		duration_sec : Sequelize.INTEGER,
		source_name : Sequelize.STRING,
		url : Sequelize.STRING,
		channel_name : Sequelize.STRING,
		resolution : Sequelize.STRING,
		size : Sequelize.FLOAT,
		group : Sequelize.STRING,
		variation_of_id : Sequelize.INTEGER
	},

	Discrepancy : {
		hash : { type: Sequelize.STRING, unique : 'hashtype' },
		description : Sequelize.STRING,
		arg1 : Sequelize.STRING,
		arg2 : Sequelize.STRING,
		media_id : Sequelize.INTEGER,
		type : { type: Sequelize.ENUM, values : ['duplicate', 'noparse', 'notfound', 'ambiguous'], unique : 'hashtype' }
	},

	Series : {

		title : Sequelize.STRING,
		title_slug : { type : Sequelize.STRING, unique : true },
		description : Sequelize.TEXT,
		tvdb_id : { type : Sequelize.STRING, unique : true },
		imdb_id : Sequelize.STRING,
		genres : Sequelize.STRING,
		votes : Sequelize.INTEGER,
		rating : Sequelize.FLOAT,
		first_air_date : Sequelize.DATE,
		poster_file : Sequelize.STRING,
		banner_file : Sequelize.STRING,
		country : Sequelize.STRING
	},

	Episodes : {

		title : Sequelize.STRING,
		series_tvdb_id : { type : Sequelize.STRING },
		season : { type : Sequelize.INTEGER },
		episode : { type : Sequelize.INTEGER },
		airyear : { type : Sequelize.INTEGER },
		airmonth : { type : Sequelize.INTEGER },
		airday : { type : Sequelize.INTEGER },
		uses_air_time : Sequelize.BOOLEAN,
		description : Sequelize.TEXT,
		tvdb_id : Sequelize.STRING,
		poster_file : Sequelize.STRING
	}
};

var _modelHooks = {
	'Series' : {
		beforeUpdate : function(s, cb)
		{
			if (s.title)
				s.title_slug = _string.slugify(s.title);

			cb(null, s);
		}
	}
}
function init()
{
	_sqlz
		.authenticate()
		.complete(function(err) {
			if (err)
				return _logger.err(err);

			initSchema();
		});
}

function createOrUpdate(dao, where, obj, cb)
{
	dao.findOrInitialize(where, obj).complete(function(err, inst, fInit)
	{
		if (err)
			return cb(err);

		if (!fInit)
		{
			for(var p in obj)
			{
				inst[p] = obj[p];
			}
		}

		inst.save().complete(cb);
	});
}

function initSchema()
{
	for(var m in _modelSchema)
	{
		var hooks = _modelHooks[m];

		if (hooks)
			hooks = { hooks : hooks };

		_sqlz.define(m, _modelSchema[m], hooks);
	}


	_sqlz.sync({force : !!_conf.wipe_db}).complete(function(err)
	{
		if (err)
			return _logger.err(err);

		for(var m in _modelSchema)
			module.exports[m] = _sqlz.model(m);

		module.exports.or = Sequelize.or;
		module.exports.transact = _sqlz.transaction;
		module.exports.createOrUpdate = createOrUpdate;
		module.exports.query = function()
		{
			return _sqlz.query.apply(_sqlz, Array.prototype.slice.call(arguments,0));
		};

		module.exports.emit('ready');
	});

}

init();

module.exports = new EventEmitter();

