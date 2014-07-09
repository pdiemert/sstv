var _channels = require('./channels');

function init()
{
	_channels.addDir('find-channels', 'find');
}

function getItems(path, cb)
{
	return _channels.getItems('find', path, cb);
}

init();

module.exports = {
	getItems : getItems
};
