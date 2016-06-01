;(function(exports) {

  'use strict';

  var Request = require('request');
  var Cheerio = require('cheerio');
  var NodeAsync = require('async');
  var Path = require('path');

  exports = module.exports = new webScraping();

  function webScraping() {
    
    var self = this;
    self.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:12.0) Gecko/20100101 Firefox/23.01',
      'Connection': 'keep-alive',
      'Keep-Alive': '300',
      'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
      'Accept-Language': 'en-us,en;q=0.5',
      'Pragma': 'public',
      'Expires': '0',
      'Cache-Control': 'must-revalidate, post-check=0, pre-check=0',
      'Content-Transfer-Encoding': 'binary',
      'Accept-Ranges': 'bytes'
    };
    self.proxy = 'http://204.14.188.53:7004';
    self.listCategories = ['video@vn', 'video@us-uk', 'video@china', 'video@korean', 'video@other', 'video@live', 'video@comedy',
                                'playback@vn', 'playback@us-uk', 'playback@china', 'playback@korean', 'playback@other',
                                'music@vn-pop', 'music@vn-rap', 'music@vn-dance', 'music@vn-media',
                                'music@us.uk-pop', 'music@us.uk-rap', 'music@us.uk-dance',
                                'music@china-pop', 'music@china-rap', 'music@china-dance',
                                'music@korean-pop', 'music@korean-rap', 'music@korean-dance',
                                'music@other-pop', 'music@other-rap', 'music@other-dance'];
    self.start = start;
    self.getTracks = getTracks;
    self.requestCookie = requestCookie;
    self.getTrackInfo = getTrackInfo;
    self.getUrlRequestByCategory = getUrlRequestByCategory;

    function curl(url, cookie, callback) {
      var cookieJar = '';
      if (cookie != null) {
        cookieJar = Request.jar();
        cookieJar.setCookie(cookie, url);
      }
      Request.get({url: url, jar: cookieJar, headers: self.headers}, function(err, response, body) {
        if (err) {
          console.log(err);
          return;
        }
        if (response.statusCode != 200) {
          console.log('The requested url could not be retrieved');
          return;
        }
        callback(Cheerio.load(body));
      });
    }

    function search(url, callback) {
      curl(url, null, function($) {
        var items = [];
        var thumbnails = [];
        var albums = [];
        var totalTracks = 0;
        var findObject = $('div.pad .h-main .page-dsms .bod table.tbtable');
        if (findObject.length == 0) {
          callback(null);
        }
        $('div.pad .h-main .page-dsms .bod table.tbtable').first().find('tr').each(function(key, value) {
           if (url.indexOf('mode=album') != -1) {
              var _this = $(this);
              if (key%2 == 0) {
                _this.find('td').each(function(key, value) {
                  var self = $(this);
                  thumbnails.push(self.find('.genmed img').attr('src'));
                });
              } else {
                _this.find('td').each(function(key, value) {
                  var self = $(this);
                  var signer = self.find('.gen a.musictitle').attr('title').split(' - ')[1]; 
                  var album = {
                    title: self.find('.gen a.musictitle').attr('title').trim(),
                    singer: signer,
                    url: self.find('.gen > a').last().attr('href'),
                    numberTracks: self.attr('title').split('\n').length
                  }
                  totalTracks += self.attr('title').split('\n').length;
                  var albumDetail = self.find('.gen');
                  albumDetail.find('br').remove();
                  albumDetail.find('a').remove();
                  albumDetail.find('span').remove();
                  var albumRelease = albumDetail.text().replace(signer, '').replace('()','').replace('(','').replace(')','').trim().split('\n')[0].split(' ');
                  album.release = (typeof albumRelease[albumRelease.length-1] != 'undefined' && albumRelease[albumRelease.length-1] != "") ? albumRelease[albumRelease.length-1] : "";
                  albums.push(album);
                });
              }
           } else {
              var _this = $(this).find('a.musictitle');
              if (key > 0 && typeof _this != 'undefined') {
                var item = {
                  title: _this.text().trim(),
                  singer: $(this).find('div.tenbh > p').last().text().trim(),
                  duration: $(this).find('span.gen').text().substring(0, 4),
                  url: 'http://chiasenhac.com/'+_this.attr('href'),
                  type: _this.attr('href').indexOf('video') != -1 ? 'video' : 'audio',
                  download: 'http://download.chiasenhac.com/'+_this.attr('href').replace('.html', '_download.html'),
                }
                items.push(item);
              }
           }
        });
        if (url.indexOf('mode=album') != -1) {
          items.push({
            nextPage: $('div.pad .h-main .page-dsms .bod a.xt').attr('href'),
            totalTracks: totalTracks
          });
          if (thumbnails.length > 0 && albums.length > 0) {
            for (var i in albums) {
              var album = albums[i];
              var thumbnail = thumbnails[i] != null ? thumbnails[i] : "";
              album.thumbnail = thumbnail;
              items.push(album);
            }
            callback(items);
          } else {
            callback(null);
          }
        } else {
          if (items.length > 0) {
            callback(items);
          } else {
            callback(null);
          }
        }
      });
    }

    function getTracks(url, cookie, callback) {
      curl(url, cookie, function($) {
        var tracks = [];
        $('#downloadlink').find('a').each(function(key, value) {
          var _this = $(this);
          var filename = Path.basename(_this.attr('href'));
          var filepath = _this.attr('href').replace(filename, '');
          var fullpath = filepath+encodeURIComponent(decodeURIComponent(filename));
          var splitFile = filename.replace('[', '').replace(']', '').trim();
          if (splitFile != '') {
            splitFile = splitFile.split(' ');
            var fileType = splitFile[1];
            var quality = splitFile[splitFile.length -1].split('.',1)[0].toUpperCase();
            tracks.push({
              file: fullpath,
              type: fileType,
              quality: quality
            });
          }
        });
        callback(tracks);
      });
    }

    function getTrackInfo(url, callback) {
      curl(url, null, function($) {
      	var lyric = $('#fulllyric').find('.genmed');
      	lyric.find('span').remove();
        var item = {
          title: $('#fulllyric').find('.maintitle a').text().trim(),
          singer: $('#fulllyric').find('p').eq(1).find('b > a').text(),
          album: $('#fulllyric').find('p').eq(2).find('b > a').text(),
          production: $('#fulllyric').find('p').eq(3).find('b').text(),
          lyric: lyric.html(),
          thumbnail: $('#fulllyric').find('img').first().attr('src')
        }
        callback(item);
      });
    }

    function top(url, callback) {
      curl(url, null, function($) {
        var items = [];
        if (url.indexOf('video') != -1) {
          $('table.page-dsms .h-main3').eq(0).find('.h-center .list-l').each(function(key, value) {
            var _this = $(this);
            var item = {
              title: _this.find('.info > a').text().trim(),
              singer: _this.find('.ma-text .info > p.spd1').text().trim(),
              duration: _this.find('.gensmall > div').text().trim(),
              url: 'http://chiasenhac.com/'+_this.find('.gensmall > a').attr('href'),
              type: 'video',
              download: 'http://download.chiasenhac.com/'+_this.find('.gensmall > a').attr('href').replace('.html', '_download.html')
            }
            items.push(item);
          });
          callback(items);
        } else {
          $('table.page-dsms .h-main4').eq(0).find('.h-center .list-r').each(function(key, value) {
            var _this = $(this);
            var title = _this.find('.text2 > a').text().trim();
            if (title != '') {
              var item = {
                title: title,
                singer: _this.find('.text2 > p.spd1').text().trim(),
                duration: _this.find('.texte2 > p').first().text().trim(),
                type: 'audio',
                url: 'http://chiasenhac.com/'+_this.find('.text2 > a').attr('href').split('/').pop(-1),
                download: 'http://download.chiasenhac.com/'+_this.find('.text2 > a').attr('href').split('/').pop(-1).replace('.html', '_download.html')
              }
              items.push(item);
            }
          });
          callback(items);
        }
      });
    }

    function category(url, callback) {
      curl(url, null, function($) {
        var items = [];
        if (url.indexOf('video') != -1) {
        	var indexTable = 0;
        	if (url.indexOf('.html') == -1) {
        		url+='new.html';
        		indexTable = 1;
        	}
            $('table.page-dsms .h-main3').eq(indexTable).find('.h-center .list-l').each(function(key, value) {
            var _this = $(this);
            var item = {
              title: _this.find('.info > a').text().trim(),
              singer: _this.find('.ma-text .info > p.spd1').text().trim(),
              duration: _this.find('.gensmall > div').text().trim(),
              url: 'http://chiasenhac.com/'+_this.find('.gensmall > a').attr('href'),
              type: 'video',
              download: 'http://download.chiasenhac.com/'+_this.find('.gensmall > a').attr('href').replace('.html', '_download.html')
            }
            items.push(item);
          });
          callback(items);
        } else {
          if (url.indexOf('.html') == -1) {
          	$('table.page-dsms .h-main4').eq(1).find('.h-center .list-r').each(function(key, value) {
	            var _this = $(this);
	            var title = _this.find('.text2 > a').text().trim();
	            if (title != '') {
	              var item = {
	                title: title,
	                singer: _this.find('.text2 > p.spd1').text().trim(),
	                duration: _this.find('.texte2 > p').first().text().trim(),
	                type: 'audio',
	                url: 'http://chiasenhac.com/'+_this.find('.text2 > a').attr('href').split('/').pop(-1),
	                download: 'http://download.chiasenhac.com/'+_this.find('.text2 > a').attr('href').split('/').pop(-1).replace('.html', '_download.html')
	              }
	              items.push(item);
	            }
	          });
          }	else {
          	$('div.page-dsms table.tbtable').find('tr').each(function(key, value) {
	            if (key > 0) {
	              var _this = $(this);
	              var title = _this.find('.gen > a.musictitle').text().trim();
	              if (title != '') {
	                var url = 'http://chiasenhac.com/'+ _this.find('.gen > a.musictitle').attr('href');
	                _this.find('.gen a').remove();
	                _this.find('.gen br').remove();
	                _this.find('.gensmall br').remove();
	                _this.find('.gensmall span').remove();
	                var item = {
	                  title: title,
	                  singer: _this.find('.gen').eq(1).text().trim(),
	                  duration: _this.find('.gensmall').eq(0).text().trim(),
	                  type: 'audio',
	                  url: url,
	                  download: url.replace('http://chiasenhac.com/','http://download.chiasenhac.com/').replace('.html', '_download.html')
	                }
	                items.push(item);
	              }
	            }
	          });
          }
          callback(items);
        }
      });
    }

    function requestCookie(callback) {
      var data = {
        username: 'mr.nav90',
        password: 'josstonebron',
        redirect: '',
        autologin: 'checked',
        login: 'Đăng nhập'
      }
      Request.post({url: 'http://chiasenhac.com/login.php', headers: self.headers, formData: data}, function(err, response, body) {
        if (err) {
          console.log(err);
          return;
        }
        var cookieStr = response.headers['set-cookie'][2].split(';', 1);
        var sessionId = response.headers['set-cookie'][3].split(';', 1);
        var cookie = cookieStr[0]+';'+sessionId[0]+';';
        callback(cookie);
      });
    }

    function getUrlRequestByCategory(category) {
      switch(category) {
          case 'video@vn':
            return 'http://chiasenhac.com/hd/video/v-video/';
          break;
          case 'video@us-uk':
            return 'http://chiasenhac.com/hd/video/u-video/';
          break;
          case 'video@china':
            return 'http://chiasenhac.com/hd/video/c-video/';
          break;
          case 'video@korean':
            return 'http://chiasenhac.com/hd/video/k-video/';
          break;
          case 'video@other':
            return 'http://chiasenhac.com/hd/video/o-video/';
          break;
          case 'video@live':
            return 'http://chiasenhac.com/hd/video/l-video/';
          break;
          case 'video@comedy':
            return 'http://chiasenhac.com/hd/video/h-video/';
          break;
          case 'playback@vn':
            return 'http://chiasenhac.com/mp3/beat-playback/v-instrumental/';
          break;
          case 'playback@us-uk':
            return 'http://chiasenhac.com/mp3/beat-playback/u-instrumental/';
          break;
          case 'playback@china':
            return 'http://chiasenhac.com/mp3/beat-playback/c-instrumental/';
          break;
          case 'playback@korean':
            return 'http://chiasenhac.com/mp3/beat-playback/k-instrumental/';
          break;
          case 'playback@other':
            return 'http://chiasenhac.com/mp3/beat-playback/o-instrumental/';
          break;
          case 'music@vn-pop':
            return 'http://chiasenhac.com/mp3/vietnam/v-pop/';
          break;
          case 'music@vn-rap':
            return 'http://chiasenhac.com/mp3/vietnam/v-rap-hiphop/';
          break;
          case 'music@vn-dance':
            return 'http://chiasenhac.com/mp3/vietnam/v-dance-remix/';
          break;
          case 'music@vn-media':
            return 'http://chiasenhac.com/mp3/vietnam/v-truyen-thong/';
          break;
          case 'music@us.uk-pop':
            return 'http://chiasenhac.com/mp3/us-uk/u-pop/';
          break;
          case 'music@us.uk-rap':
            return 'http://chiasenhac.com/mp3/us-uk/u-rap-hiphop/';
          break;
          case 'music@us.uk-dance':
            return 'http://chiasenhac.com/mp3/us-uk/u-dance-remix/';
          break;
          case 'music@china-pop':
            return 'http://chiasenhac.com/mp3/chinese/c-pop/';
          break;
          case 'music@china-rap':
            return 'http://chiasenhac.com/mp3/chinese/c-rap-hiphop/';
          break;
          case 'music@china-dance':
            return 'http://chiasenhac.com/mp3/chinese/c-dance-remix/';
          break;
          case 'music@korean-pop':
            return 'http://chiasenhac.com/mp3/korea/k-pop/';
          break;
          case 'music@korean-rap':
            return 'http://chiasenhac.com/mp3/korea/k-rap-hiphop/';
          break;
          case 'music@korean-dance':
            return 'http://chiasenhac.com/mp3/korea/k-dance-remix/';
          break;
          case 'music@other-pop':
            return 'http://chiasenhac.com/mp3/other/o-pop/';
          break;
          case 'music@other-rap':
            return 'http://chiasenhac.com/mp3/other/o-rap-hiphop/';
          break;
          case 'music@other-dance':
            return 'http://chiasenhac.com/mp3/other/o-dance-remix/';
          break;
        }
    }

    function start(url, type, callback) {
      switch(type) {
        case 'search':
          search(url, function(items) {
            callback(items);
          });
        break;
        case 'top':
          top(url, function(items) {
            callback(items);
          });
        break;
        case 'category':
          category(url, function(items) {
            callback(items);
          });
        break;
      }
    }
  }
})(exports);

