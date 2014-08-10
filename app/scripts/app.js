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

var github_user_repos = function(username, callback, page_number, prev_data) {
    var page = (page_number ? page_number : 1),
        url = 'https://api.github.com/users/' + username + '/repos?callback=?',
        data = (prev_data ? prev_data : []);

    if (page_number > 1) {
      url += '&page=' + page_number;
    }
    $.getJSON(url, function(repos) {
        data = data.concat(repos.data);
        if (repos.data.length > 0) {
            github_user_repos(username, callback, page + 1, data);
        } else {
            callback(data);
        }
    });
}

github_user_repos("jhbruhn", function(data) {
  var languages = {}, total = 0;
  
  $.each(data, function(i, repo) {
    if (repo.fork !== false) {
      return;
    }

    if (repo.language) {
      if (repo.language in languages) {
        languages[repo.language]++;
      } else {
        languages[repo.language] = 1;
      }
      total++;
    }
  });
  
  
  var langs = [];
  
  for(var key in languages) {
    var l = languages[key];
    langs.push({language: key, count: l});
  }
  langs.sort(function(a, b) {
    return a.count < b.count;
  });
  
  var finalLangs = [];
  var sum = 0;
  console.log(langs);
  $.each(langs, function(i, l) {
    console.log(i);
    if(i > 2) return;
    finalLangs.push({language: l.language, count: l.count});
    sum += l.count;
  })
  console.log(finalLangs);
  $.each(finalLangs, function(i, l) {
    finalLangs[i].percent = Math.round((l.count / sum) * 100);
    console.log(languages[i]);
    var $div = $("<div></div>");
    $div.append(l.language);
    var $progressOuter = $("<div class='progress'></div>");
    var $progressInner = $("<div class='progress-bar' role='progressbar'>" + finalLangs[i].percent + "%</div>");
    $progressInner.width(finalLangs[i].percent + "%");
    $progressOuter.append($progressInner[0]);
    $div.append($progressOuter[0])
    $("#langStats").append($div);
  });
  
  $("#langStats").show();
});
  
$("#langStats").hide();
