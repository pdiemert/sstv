

function err(err)
{
	if (err.stack)
		console.error('Unexpected error: %s', err.stack);
	else
		console.error.apply(this, arguments);
}

function info()
{
	console.log.apply(this, arguments);

}

module.exports = {

	err : err,
	error : err,
	inf : info,
	info : info,
	information : info
};