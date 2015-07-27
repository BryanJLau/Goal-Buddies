var express = require('express');
var routes = require('./routes/index');
var http = require('http');
var path = require('path');
var app = express();
// all environments
app.set('port', process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080);
app.set('address', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
var stylus = require('stylus');
app.use(stylus.middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}
app.get('/', routes.index);
app.get('/about', routes.about);
app.get('/contact', routes.contact);
http.createServer(app).listen(parseInt(app.get('port')), app.get('address'), null, function () {
    console.log('Express server listening on port ' + app.get('port'));
});
//# sourceMappingURL=app.js.map