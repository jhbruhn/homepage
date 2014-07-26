'use strict';

/**
 * @ngdoc function
 * @name pedasPageApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the pedasPageApp
 */
angular.module('pedasPageApp')
  .controller('LanguagesCtrl', function ($scope, $http) {
    $http({method: 'GET', url: 'http://osrc.dfm.io/jhbruhn.json'}).
      success(function(data) {
        var languages = [];
        var sum = 0;
        angular.forEach(data.usage.languages, function(l, i) {
          if(i > 2) {
            return;
          }
          languages.push(l);
          sum += l.count;
        });
        angular.forEach(languages, function(l, i) {
          languages[i].percent = Math.round((l.count / sum) * 100);
        });
        $scope.languages = languages;
      });
  });
