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
  
    google.setOnLoadCallback(function() {
      $('#musiccol').append($compile('<feed summary=\"false\" count=\"16\" url=\"http://ws.audioscrobbler.com/1.0/user/jhbruhn/recenttracks.rss\" />')($rootScope));
      $('#blogposts').append($compile('<feed summary="true" count="3" url="http://blog.jhbruhn.de/rss/" />')($rootScope));

      $rootScope.$apply();
    });

  });
