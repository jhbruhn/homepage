'use strict';


var counter;

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

$.get('https://jhbruhn.de/osrc/jhbruhn.json').
  done(function(data) {
    var languages = [];
    var sum = 0;
    $.forEach(data.usage.languages, function(l, i) {
      if(i > 2) {
        return;
      }
      languages.push(l);
      sum += l.count;
    });
    $.forEach(languages, function(l, i) {
      languages[i].percent = Math.round((l.count / sum) * 100);
      var $div = $("<div></div>");
      $div.append($(l.language));
      var $progressOuter = $("<div class='progress'></div>");
      var $progressInner = $("<div class='progress-bar' role='progressbar'>" + languages[i].percent + "%</div>");
      $progressInner.width(languages[i].percent + "%");
      $progressOuter.append($progressInner);
      
      $("#langStats").append($div);
    });
    $("#langStats").show();
  });
  
$("#langStats").hide();
