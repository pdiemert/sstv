
var _conf = global.conf;

var _logger = require('./lib/logger');

require('./lib/db');
require('./lib/browse');
require('./lib/find');

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(require('./lib/ua.js'));
app.use(favicon());
//app.use(logger());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));

app.use(require('getsmart-js')({
	compress: false,
	isProduction: false,
	src: path.join(__dirname, 'public')
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/api', require('./routes/api'));
app.use('/image', require('./routes/image'));

/// catch 404 and forward to error handler
app.use(function(err, req, res, next) {
	_logger.err('error loading ' + req.path );
	if (err)
		console.error(err.stack ? err.stack : err);

	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});

/*
	var err = new Error('Not Found');
    err.status = 404;
    next(err);
    */
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
	    if (err)
	        console.error(err.stack ? err.stack : err);

        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;

