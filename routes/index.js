var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var geocoder = require('geocoder');
var request = require('request');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');



// our db model
var Ufo = require("../models/model.js");

router.get('/api/updateDatabase/:month', function(req, res) {
    if(!req.query.password || req.query.password != process.env.API_PASSWORD){
      return res.send('Need master pass')
    }
    var month = req.params.month;
    request('http://www.nuforc.org/webreports/ndxe' + month + '.html', function(error, response, html) {
        if (!error && response.statusCode == 200) {
            var $ = cheerio.load(html);
            cheerioTableparser($);
            var data = $("table:first-child").parsetable();
            var rows = data[0].length;
            var columns = data.length;
            var counter = 0;
            for (var i = 1; i < rows; i++) {

                var ufoToLog = {};

                ufoToLog.city = $(data[1][i]).text();
                var date = new Date($(data[0][i]).text());
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                ufoToLog.date = date;
                ufoToLog.url = "http://www.nuforc.org/webreports/" + $(data[0][i]).find('a').attr('href');
                ufoToLog.state = $(data[2][i]).text();
                ufoToLog.summary = $(data[5][i]).text();
                ufoToLog.duration = $(data[4][i]).text();
                ufoToLog.shape = $(data[3][i]).text();

                var locationToRequest = ufoToLog.city;
                if (ufoToLog.state != "") {
                    locationToRequest += ", " + ufoToLog.state;
                }

                addLocation(i, ufoToLog, locationToRequest);


            }
            res.send('UFO Sightings for http://www.nuforc.org/webreports/ndxe' + month + '.html will be added');
        }

    });
})

function addLocation(i, ufoToLog, locationToRequest) {
    setTimeout(timed, i * 100);

    function timed() {
        geocoder.geocode(locationToRequest, function(err, data) {
            console.log("Logging " + i);
            if (data.status == "OK") {
                var lat = data.results[0].geometry.location.lat;
                var lon = data.results[0].geometry.location.lng;

                ufoToLog.loc = [lon, lat];
                var ufoSighting = new Ufo(ufoToLog);
                ufoSighting.save(function(error, data) {
                    // if err saving, respond back with error
                    if (error) {
                        var errorJson = {
                            status: 'ERROR',
                            message: 'Error saving ufo',
                            mongoMsg: error.message
                        };
                        console.log(errorJson);
                    } else {
                        console.log("Ufo added")
                    }
                })
            } else {
                var error = {
                    status: 'ERROR',
                    message: 'Could not Geocode location: ' + locationToRequest
                };
                var ufoSighting = new Ufo(ufoToLog);
                ufoSighting.save(function(error, data) {
                    // if err saving, respond back with error
                    if (error) {
                        var errorJson = {
                            status: 'ERROR',
                            message: 'Error saving ufo',
                            mongoMsg: error.message
                        };
                        console.log(errorJson);
                    } else {
                        console.log("Ufo added")
                    }
                })
            }
        })
    }
}

router.get('/', function(req, res) {
    res.redirect('/api');
});

router.get('/api', function(req, res) {

    res.render('api.html')
});

router.get('/api/sightings/location/near', function(req, res) {

    var options = {
        spherical: true
    };

    options.limit = req.query.limit ? Number(req.query.limit) : 100;
    options.skip = req.query.skip ? Number(req.query.skip) : 0;

    if (req.query.radius) {
        options.maxDistance = Number(req.query.radius);
    }

    if (req.query.lat && req.query.lon) {
        var lat = Number(req.query.lat);
        var lon = Number(req.query.lon);

        var point = {
            type: "Point",
            coordinates: [lon, lat]
        }
        geoNear(point, options);
    } else if (req.query.location) {
        // Geocoding
        geocoder.geocode(req.query.location, function(err, data) {
            if (data.status == "OK") {
                var lat = data.results[0].geometry.location.lat;
                var lon = data.results[0].geometry.location.lng;

                var point = {
                    type: "Point",
                    coordinates: [lon, lat]
                }
                geoNear(point, options);
            } else {
                var error = {
                    status: 'ERROR',
                    message: 'Could not Geocode location: ' + req.query.location
                };
                return res.json(error);
            }

        });
    } else {
        var error = {
            status: 'ERROR',
            message: 'Please specify either a lat/lon pair or a location.'
        };
        return res.json(error);
    }

    function geoNear(location, options) {
        Ufo.geoNear(location, options, function(err, data) {
            // if err or no animals found, respond with error
            if (err || data == null) {
                var error = {
                    status: 'ERROR',
                    message: 'Error querying the database'
                };
                return res.json(error);
            }

            // otherwise, respond with the data

            var jsonData = {
                status: 'OK',
                sightingsReturned: data.length,
                sightings: data
            }

            res.json(jsonData);

        })
    }

})

router.get('/api/sightings/location/bbox', function(req, res) {
    var location = req.query.location;

    var setOptions = {}
    setOptions.skip = req.query.skip ? Number(req.query.skip) : 0;
    setOptions.limit = req.query.limit ? Number(req.query.limit) : 100;

    if (req.query.bbox) {
        var coordinates = req.query.bbox.split(',');
        var box = [
            [coordinates[0], coordinates[1]],
            [coordinates[2], coordinates[3]]
        ];
        boundingBox(box);
    } else if (req.query.location) {
        geocoder.geocode(location, function(err, data) {
            if (data.status == "OK") {
                var box = [
                    [data.results[0].geometry.bounds.southwest.lng, data.results[0].geometry.bounds.southwest.lat],
                    [data.results[0].geometry.bounds.northeast.lng, data.results[0].geometry.bounds.northeast.lat]
                ];
                boundingBox(box);
            } else {
                var error = {
                    status: 'ERROR',
                    message: 'Could not geoCode location: ' + location
                };
                return res.json(error);
            }

        });
    } else {
        var error = {
            status: 'ERROR',
            message: 'Please specify either a bbox or a location.'
        };
        return res.json(error);
    }

    function boundingBox(boxArray) {
        var filterObject = {
            loc: {
                $geoWithin: {
                    $box: boxArray
                }
            }
        };
        Ufo.find(filterObject).setOptions(setOptions).exec(function(err, data) {
            // if err or no animals found, respond with error
            if (err || data == null) {
                var error = {
                    status: 'ERROR',
                    message: 'Error querying the database'
                };
                return res.json(error);
            }

            // otherwise, respond with the data

            var jsonData = {
                status: 'OK',
                sightingsReturned: data.length,
                sightings: data
            }

            res.json(jsonData);

        })
    }
})



router.get('/api/sightings/search', function(req, res) {

    var queryObject = req.query;

    var filterObject = {}

    //By date
    var dateQuery = {}
    if (queryObject.from) {
        var start = queryObject.from;
        var startDate = new Date(start);
        if (startDate == "Invalid Date") {
            var error = {
                status: 'ERROR',
                message: 'Invalid FROM Date'
            }
            return res.json(error)
        }
        startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset())
        dateQuery['$gte'] = startDate;
    }
    if (queryObject.to) {
        var end = queryObject.to;
        var endDate = new Date(end);
        if (endDate == "Invalid Date") {
            var error = {
                status: 'ERROR',
                message: 'Invalid TO Date'
            }
            return res.json(error)
        }
        endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset())
        dateQuery['$lt'] = endDate;
    }
    if (Object.keys(dateQuery).length > 0) {
        filterObject['date'] = dateQuery;
    }

    //Filter by shape
    if (queryObject.shape) {
        filterObject['shape'] = new RegExp('^' + queryObject.shape + '$', "i")
    }

    //Filter by state
    if (queryObject.state) {
        filterObject['state'] = new RegExp('^' + queryObject.state + '$', "i")
    }

    //Filter by city
    if (queryObject.city) {
        filterObject['city'] = new RegExp('^' + queryObject.city + '$', "i")
    }

    var setOptions = {}
    setOptions.skip = req.query.skip ? Number(req.query.skip) : 0;
    setOptions.limit = req.query.limit ? Number(req.query.limit) : 100;


    Ufo.find(filterObject).setOptions(setOptions).exec(function(err, data) {
        if (err || data == null) {
            var error = {
                status: 'ERROR',
                message: 'Error querying the database'
            };
            return res.json(error);
        }

        // otherwise, respond with the data

        var jsonData = {
            status: 'OK',
            sightingsReturned: data.length,
            sightings: data
        }

        res.json(jsonData);

    })

})

module.exports = router;
