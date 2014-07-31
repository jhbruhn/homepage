'use strict';

/**
 * @ngdoc function
 * @name pedasPageApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the pedasPageApp
 */
angular.module('pedasPageApp')
  .controller('MainCtrl', function ($rootScope, $compile) {
  	var counter = 0;
  	$("#blogposts").rss("http://blog.jhbruhn.de/rss", {
  		limit: 3,
      ssl: true,
  		tokens: {
  			hr: function(entry, token) {
  			  counter++;
  			  return counter < 3 ? "<hr />" : "";
  			}
  		},
  		layoutTemplate: "<ul class='media-list'>{entries}</ul>",
  		entryTemplate: "<li class='media'><div class='media-body'><h4 class='media-heading'><a href='{url}' target='_new'>{title}</a></h4><p>{shortBodyPlain}</p></div>{hr}</li>"
  	});
  	counter = 0;
  	$("#musiccol").rss("http://ws.audioscrobbler.com/1.0/user/jhbruhn/recenttracks.rss", {
  		limit: 16,
      ssl: true,
  		layoutTemplate: "<ul class='media-list'>{entries}</ul>",
  		entryTemplate: "<li class='media'><div class='media-body'><h4 class='media-heading'><a href='{url}' target='_new'>{title}</a></h4></li>"
  	});
  });
