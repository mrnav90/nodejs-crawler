;(function(exports) {

  'use strict';

  var Restify = require('restify');
  var Scraping = require('./scraping');

  new Server();

  function Server() {

    var self = this;
    self.server = Restify.createServer();
    self.server.use(Restify.fullResponse()).use(Restify.queryParser()).use(Restify.bodyParser());
    self.port = process.env.PORT || 8080;
    self.ip = '128.199.135.28';
    self.server.get('/search', search);
    self.server.get('/track', track);
    self.server.get('/trackInfo', trackInfo);
    self.server.get('/cookie', cookie);
    self.server.get('/top', top);
    self.server.get('/category',category);
    self.server.listen(self.port, self.ip, function (err) {
      if (err) {
        console.error(err);
        return;
      }
      console.log('Server running at: ' + self.server.url);
    });

    function track(req, res) {
      if (!!req.params.url) {
        var cookie = "csn_data=a%3A2%3A%7Bs%3A11%3A%22autologinid%22%3Bs%3A32%3A%22b78e2ed4b42422c31911d48f7cede7b1%22%3Bs%3A6%3A%22userid%22%3Bs%3A6%3A%22471922%22%3B%7D;csn_sid=7c4c4a50a30b6a1b07aec7ba0854df8e;";
        Scraping.getTracks(req.params.url, cookie, function(tracks) {
          res.json({
            statusCode: 200,
            message: 'OK',
            data: tracks
          });
        });
      } else {
        res.json({
          statusCode: 400,
          message: 'Invalid params'
        });
      }
    }

    function trackInfo(req, res) {
      if (!!req.params.url) {
        Scraping.getTrackInfo(req.params.url, function(trackInfo) {
          res.json({
            statusCode: 200,
            message: 'OK',
            data: trackInfo
          });
        });
      } else {
        res.json({
          statusCode: 400,
          message: 'Invalid params'
        });
      }
    }

    function cookie(req, res) {
      Scraping.requestCookie(function(cookie) {
        res.json({
          statusCode: 200,
          message: 'OK',
          data: cookie
        });
      });
    }

    function top(req, res) {
      if (!!req.params.type && Scraping.listCategories.indexOf(req.params.type) != -1) {
        var urlRequest = Scraping.getUrlRequestByCategory(req.params.type);
        Scraping.start(urlRequest, 'top', function(items) {
          res.json({
            statusCode: 200,
            message: 'OK',
            data: items
          });
        });
      } else {
        res.json({
          statusCode: 400,
          message: 'Invalid params'
        })
      }
    }

    function category(req, res) {
      if (!!req.params.type && Scraping.listCategories.indexOf(req.params.type) != -1) {
        var urlRequest = Scraping.getUrlRequestByCategory(req.params.type);
        if (!!req.params.page) {
          urlRequest += 'new.html';
          var page = req.params.page;
          if (urlRequest.indexOf('mp3') != -1) {
              page = page - 1;
          }
          if (page > 1) {
            urlRequest = urlRequest.replace('.html', page+'.html');
          }
        }
        Scraping.start(urlRequest, 'category', function(items) {
          res.json({
            statusCode: 200,
            message: 'OK',
            data: items
          });
        });
      } else {
        res.json({
          statusCode: 400,
          message: 'Invalid params'
        })
      }
    }

    function search(req, res) {
      var params = '';
      for (var key in req.params) {
        if (['q', 'mode', 'order', 'cat', 'page', 'start'].indexOf(key) != -1) {
          var param = req.params[key];
          if (param != '') {
            if (key == 'q') {
              if (params.indexOf('?') === -1) {
                params+= '?s='+param.replace(/ /g,'+');
              } else {
                params+= '&s='+param.replace(/ /g,'+');
              }
            } else {
              if (params.indexOf('?') === -1) {
                params+= '?'+key+'='+param;
              } else {
                params+= '&'+key+'='+param;
              }
            }
          }
        } else {
          res.json({
            statusCode: 400,
            message: 'Invalid params'
          })
        }
      }
      var url = 'http://search.chiasenhac.com/search.php'+params;
      Scraping.start(url, 'search', function(items) {
        if (items == null) {
          res.json({
            statusCode: 404,
            message: 'Not Found'
          });
        } else {
          res.json({
            statusCode: 200,
            message: 'OK',
            data: items
          })
        }
      });
    }
  }
})(exports);