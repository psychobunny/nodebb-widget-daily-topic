"use strict";

var async = module.parent.require('async');
var nconf = module.parent.require('nconf');
var validator = module.parent.require('validator');

var db = module.parent.require('./database');
var categories = module.parent.require('./categories');
var user = module.parent.require('./user');
var plugins = module.parent.require('./plugins');
var topics = module.parent.require('./topics');
var posts = module.parent.require('./posts');
var groups = module.parent.require('./groups');
var utils = module.parent.require('./utils');

var benchpressjs = module.parent.require('benchpressjs');

var app;

var Widget = module.exports;

Widget.init = function(params, callback) {
	app = params.app;
	callback();
};

function getCidsArray(widget) {
	var cids = widget.data.cid || '';
	cids = cids.split(',');
	cids = cids.map(function (cid) {
		return parseInt(cid, 10);
	}).filter(Boolean);
	return cids;
}

Widget.renderWidget = function(widget, callback) {
	var cids = getCidsArray(widget);
	async.waterfall([
		function (next) {
			var key;
			if (cids.length) {
				if (cids.length === 1) {
					key = 'cid:' + cids[0] + ':tids';
				} else {
					key = cids.map(function (cid) {
						return 'cid:' + cid + ':tids';
					});
				}
			} else {
				key = 'topics:recent';
			}
			topics.getTopicsFromSet(key, widget.uid, 0, 30, next);
		},
		function (data, next) {
			var topic = {};

			if (data.topics.length) {
				data.topics = data.topics.sort(function(a, b){
					return parseInt(a.timestamp, 10) < parseInt(b.timestamp, 10) ? 1 : -1
				});
	
				var mostRecentTopicDate = new Date(data.topics[0].timestamp)
				var todaysDate = new Date();

				if (mostRecentTopicDate.setHours(0,0,0,0) === todaysDate.setHours(0,0,0,0)) {
					topic = data.topics[0];
				} else {
					topic = data.topics[todaysDate.getDate() % data.topics.length];
				}
			}

			posts.getPostsByPids([topic.mainPid], widget.uid, function(err, posts) {
				if (err) {
					return next (err);
				}

				app.render('widgets/dailytopic', {
					topic: {
						title: topic.title,
						content: posts[0].content,
						slug: topic.slug,
					},
					count: data.topics.length,
					relative_path: nconf.get('relative_path')
				}, next);
			});
		},
		function (html, next) {
			widget.html = html;
			next(null, widget);
		},
	], callback);
};

Widget.defineWidgets = function(widgets, callback) {
	var widget = {
		widget: "dailytopic",
		name: "Daily Topic",
		description: "Rotating topic of the day widget.",
		content: 'admin/dailytopic'
	};

	app.render(widget.content, {}, function(err, html) {
		widget.content = html;
		widgets.push(widget);
		callback(err, widgets);
	});
};
