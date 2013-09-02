require('js-yaml');
var when = require('when');
var rql = require('rql-promise');
var r = require('rethinkdb');

var config = require('./config.yaml');
var util = require('util');

var w = require('whiskers');
var async = require('async');

var conn;
var serveError = function (page, error, res) {
    res.statusCode = 500;
    res.end(util.inspect(err));
    console.log(page, error);
};

rql.connect();

var servePage = function (path, res) {
    rql(r.db(config.database).table('pages').get(path)).then(function (page) {
        page.view = page.view || 'default';
        return when.join(page, rql(r.db(config.database).table('views').get(page.view)));
    }, function (error) {
        serveError(path, error, res);
    }).then(function (args) {
	var page = args[0], view = args[1];
	res.write(w.render(view.head, page));

	var posts = [];
	page.posts.forEach(function(post) {
            posts.push(rql(r.db(config.database).table('posts').get(post)));
        });

        when.map(posts, function (post) {
            res.write(w.render(view.post,post));
        }).then(function () {
            res.end(w.render(view.tail, page));
        }, function (error) {
            res.end(util.inspect(error));
            res.end(w.render(view.tail, page));
        });
    }, function (error) {
        serveError(path, error || 'Could not fetch view', res);
    });

};

var route = function (req, res) {
    if (req.method == 'GET') servePage(req.url, res);
    else switch (req.method) {
        case "POST":
            break;
        case "PUT":
            break;
        case "DELETE":
            break;
        default:
            res.statusCode = 400;
            res.end();
    }
};

var http = require('http');
http.createServer(route).listen(config.bind);
