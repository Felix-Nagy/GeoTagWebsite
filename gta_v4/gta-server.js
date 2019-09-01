
var http = require('http');

var logger = require('morgan');
var bodyParser = require('body-parser');
var express = require('express');

var app;
app = express();
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}));


app.set('view engine', 'ejs');



app.use(express.static('public'));



function GeoTag(latitude, longitude, name, hashtag) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.name = name;
    this.hashtag = hashtag;
}



var geoTagMemory = (function GeoTagMemory() {

    var geoTags = [];

    return {
        lastSubmittedLatitude : 0,
        lastSubmittedLongitude: 0,
        getById: function (id) {
            return geoTags[id];
        },
        addGeoTag: function (geoTag) {
            geoTags.push(geoTag);
        },
        deleteById: function (id) {
            return geoTags.splice(id, 1);
        },
        searchByName:  function (name) {
            return geoTags.filter(geoTag => geoTag.name === name);
        },
        searchInArea: function (lat, lon, radius) {
            var result = [];

            geoTags.forEach(function(geoTag) {
                    var distance = Math.sqrt(
                        Math.pow(lat - geoTag.latitude, 2) +
                        Math.pow(lon - geoTag.longitude, 2)
                    );

                    if (distance <= radius)
                        result.push(geoTag);
                }
            );

            return result;
        },
        toString: function() {
            return JSON.stringify(geoTags);
        }
    }
})();


app.get('/', function(req, res) {
    res.render('gta', {
        taglist: [],
        coords: {
            latitude: '',
            longitude: ''
        }
    });
});



const STANDARD_RADIUS = 100;
app.post('/tagging', function(req, res) {
    var lat = req.body.latitude;
    var lon = req.body.longitude;

    var geoTag = new GeoTag(
        lat,
        lon,
        req.body.name,
        req.body.hashtag
    );
    geoTagMemory.addGeoTag(geoTag);

    res.render('gta', {
        taglist: geoTagMemory.searchInArea(lat, lon, STANDARD_RADIUS),
        coords: {
            latitude: lat,
            longitude: lon
        }
    });
});



app.post('/discovery', function(req, res) {
    var lat = req.body.latitude;
    var lon = req.body.longitude;
    var term = req.body.search;

    var resultTagList;
    if (term)
        resultTagList = geoTagMemory.searchByName(term);
    else
        resultTagList = geoTagMemory.searchInArea(lat, lon, STANDARD_RADIUS);

    res.render('gta', {
        taglist: resultTagList,
        coords: {
            latitude: lat,
            longitude: lon
        }
    });
});



app.use(bodyParser.json());
var url = require('url');

var geoTagSearch = function(req, res) {
    var query = url.parse(req.url, true).query;
    var name = (query["name"] !== undefined) ? query["name"] : '';
    var radius = (query["radius"] !== undefined) ? query["radius"] : STANDARD_RADIUS;

    var resultTagList;
    if (name) {
        resultTagList = geoTagMemory.searchByName(name);
    }
    else {
        resultTagList = geoTagMemory.searchInArea(
            geoTagMemory.lastSubmittedLatitude,
            geoTagMemory.lastSubmittedLongitude,
            radius
        );
    }
    res.send(JSON.stringify(resultTagList));
};

var addGeoTag = function (req, res) {
    var lat = req.body.latitude;
    var lon = req.body.longitude;

    geoTagMemory.lastSubmittedLatitude = lat;
    geoTagMemory.lastSubmittedLongitude = lon;

    var geoTag = new GeoTag(
        lat,
        lon,
        req.body.name,
        req.body.hashtag
    );
    geoTagMemory.addGeoTag(geoTag);
    res.sendStatus(201);
};

var getGeoTag = function (req, res) {
    var geoTag = geoTagMemory.getById(req.params.id);
    res.send(JSON.stringify(geoTag));
};

var putGeoTag = function (req, res) {
    var geoTag = geoTagMemory.getById(req.params.id);

    geoTag.name = req.body.name;
    geoTag.hashtag = req.body.hashtag;
    geoTag.longitude = req.body.longitude;
    geoTag.latitude = req.body.latitude;

  
    res.send(geoTagMemory.toString());
};

var deleteGeoTag = function (req, res) {
    geoTagMemory.deleteById(req.params.id);

    
    res.send(geoTagMemory.toString());
};

app.route('/geotags')
    .get(geoTagSearch)
    .post(addGeoTag);

app.route('/geotags/:id')
    .get(getGeoTag)
    .put(putGeoTag)
    .delete(deleteGeoTag);




var port = 3000;
app.set('port', port);



var server = http.createServer(app);



server.listen(port);
