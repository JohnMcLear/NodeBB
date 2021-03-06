"use strict";

var app,
	middleware = {},
	nconf = require('nconf'),
	async = require('async'),
	user = require('./../user'),
	meta = require('./../meta'),
	plugins = require('./../plugins'),

	controllers = {
		api: require('./../controllers/api')
	};


middleware.isAdmin = function(req, res, next) {
	user.isAdministrator((req.user && req.user.uid) ? req.user.uid : 0, function (err, isAdmin) {
		if (!isAdmin) {
			res.status(403);
			res.redirect('/403');
		} else {
			next();
		}
	});
};

middleware.buildHeader = function(req, res, next) {
	async.parallel([
		function(next) {
			var custom_header = {
				'plugins': [],
				'authentication': []
			};

			user.getUserFields(req.user.uid, ['username', 'userslug', 'picture'], function(err, userData) {
				plugins.fireHook('filter:admin.header.build', custom_header, function(err, custom_header) {
					var data = {
						csrf: res.locals.csrf_token,
						relative_path: nconf.get('relative_path'),
						plugins: custom_header.plugins,
						authentication: custom_header.authentication,
						userpicture: userData.picture,
						username: userData.username,
						userslug: userData.userslug,
						'cache-buster': meta.config['cache-buster'] ? 'v=' + meta.config['cache-buster'] : '',
						env: process.env.NODE_ENV ? true : false
					};

					app.render('admin/header', data, function(err, template) {
						res.locals.adminHeader = template;
						next(err);
					});
				});
			});
		},
		function(next) {
			controllers.api.getConfig(req, res, function(err, config) {
				res.locals.config = config;
				next(err);
			});
		},
		function(next) {
			app.render('admin/footer', {}, function(err, template) {
				res.locals.adminFooter = template;
				next(err);
			});
		}
	], function(err) {
		next();
	});
};

module.exports = function(webserver) {
	app = webserver;
	return middleware;
};