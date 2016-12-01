var shapes = [];
var stateCounter = {};
var reportsData = {};
var reportsDataLength = null;

$(document).ready(function() {

    var probe;

    var year = 2016;
    var month = 09;
    var timelineEntries = [];

    var width = 960,
        height = 600;

    var mapPath = "/data/us.json";

    var projection = d3.geo.albersUsa()
        .scale(1280)
        .translate([width / 2, height / 2]);

    var path = d3.geo.path()
        .projection(projection);

    var svg = d3.select("#map-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    d3.json(mapPath, function(error, us) {
        if (error) return console.error(error);

        svg.append("path")
            .datum(topojson.feature(us, us.objects.land))
            .attr("d", path)
            .attr("class", "land-boundary");

        svg.append("path")
            .datum(topojson.mesh(us, us.objects.counties, function(a, b) {
                return a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0);
            }))
            .attr("d", path)
            .attr("class", "county-boundary");

        svg.append("path")
            .datum(topojson.mesh(us, us.objects.states, function(a, b) {
                return a !== b;
            }))
            .attr("d", path)
            .attr("class", "state-boundary");

        probe = d3.select("#map-container").append("div")
            .attr("id", "probe");

        $.getJSON('/data/dataFinal.json', function(data) {
            console.log(data);
            var entries;

            if ($(window).width() < 1400) {
                entries = data.timeline.slice(0, 393);
            } else if ($(window).width() < 1500) {
                entries = data.timeline.slice(0, 509);
            } else {
                entries = data.timeline.slice(0, 609);
            }


            var total = 0;
            entries.forEach(function(e, i) {
                reportsData[e.date] = e.reports;
                total += Number(e.sightings);
                var reportList = e.reports;
                reportList.forEach(function(e) {
                    if (shapes.indexOf(e.shape) == -1 && e.shape) {
                        shapes.push(e.shape);
                    }
                    if (Object.keys(stateCounter).indexOf(e.state) == -1 && e.state) {
                        stateCounter[e.state] = 1;
                    } else if (e.state) {
                        stateCounter[e.state]++;
                    }
                })
            })
            reportsDataLength = Object.keys(reportsData).length
            $('#mostSightingState').text(sortProperties(stateCounter)[0][0]);
            $('#totalShapes').text(shapes.length);
            $('#totalSightings').text(total);
            window.timelineData = entries;
            createSlider2();
            // $('#loading-content').remove();
            $('#loading-content').fadeOut('slow', function() {
                $('#content-container').css('opacity', 1);
            })
        });
    });

    var displaySightings = function(data, date) {
        var shapesMonth = {};
        var dateSplit = date.split('/');
        var sightingsCounter = 0;
        $('#timePeriod').text(months[dateSplit[0] - 1] + " " + dateSplit[1]);
        var sightings = svg.selectAll('.sighting').data(data, function(d) {

            return d.url;
        });

        d3.xml("data/UFO.svg", function(xml) {

            // Take xml as nodes.
            var imported_node = document.importNode(xml.documentElement, true);

            sightings.enter()
                .append("g")
                .attr("class", function(d) {

                    return "sighting " + d.shape
                })
                .each(function(d, i) {
                    // Clone and append xml node to each data binded element.
                    var imported_svg = this.appendChild(imported_node.cloneNode(true));
                })
                .attr("transform", function(d, i) {
                    var x = projection([d.long, d.lat])
                    x = 0 - 50;
                    var y = projection([d.long, d.lat]);
                    y = Math.floor(Math.random() * 600);
                    return "translate(" + (x) + "," + (y) + ") scale(0.1)";
                })
                .on("mousemove", function(d) {
                    setProbeContent(d);
                    var offset = $("#map-container").offset();
                    probe
                        .style({
                            "display": "block",
                            "top": (d3.event.pageY - 30 - offset.top) + "px",
                            "left": (d3.event.pageX + 30 - offset.left) + "px"
                        })
                })
                .on("mouseout", function() {
                    probe.style("display", "none");
                })
                .on("click", function(d) {
                    $("#infoCon").css('visibility', 'visible');
                    createInfo(d);
                })
                .style('opacity', 1)
                .transition().duration(2000)
                .attr("transform", function(d, i) {
                    var x = projection([d.long, d.lat])
                    x = (x) ? x[0] : -150;
                    var y = projection([d.long, d.lat]);
                    y = (y) ? y[1] : -150;
                    if (x != -150) {
                        sightingsCounter++;
                        if (Object.keys(shapesMonth).indexOf(d.shape) == -1 && d.shape) {
                            shapesMonth[d.shape] = 1;
                        } else if (d.shape) {
                            shapesMonth[d.shape]++;
                        }
                        return "translate(" + (x - (17.67 / 2)) + "," + (y - (12.97 / 2)) + ") scale(0.03)";
                    } else {
                        this.remove();
                    }

                });

            createShapeBarChart(shapesMonth);
            $('#monthlySightings').text(sightingsCounter);

            sightings.exit()
                .transition().duration(2000)
                // .style('opacity', 0)
                .attr("transform", function(d, i) {
                    var x = projection([d.long, d.lat])
                    x = 960 + 50;
                    var y = projection([d.long, d.lat]);
                    // y = 300;
                    y = Math.floor(Math.random() * 600);
                    return "translate(" + (x) + "," + (y) + ") scale(0.1)";
                })
                .remove();
        });
    }


    function setProbeContent(d) {
        $('#shape').text(d.shape);
        var state = (d.state) ? ", " + d.state : "";
        var html = "<strong>" + d.city + state + "</strong><br/>" +
            d.date;
        probe
            .html(html);
    }

    var sliderScale, slider, dateScale;

    var sliderMargin = 65;

    function createSlider2() {

        dateScale = createDateScale(Object.keys(reportsData))
        sliderScale = d3.scale.linear().domain([0, Object.keys(reportsData).length - 1]);

        var val = slider ? slider.value() : 0;

        slider = d3.slider()
            .scale(sliderScale)
            .on("slide", function(evt, value) {
                if (evt.type == 'click') {
                    var monthYear = Object.keys(reportsData)[(reportsDataLength - 1) - Math.ceil(value)];
                    displaySightings(reportsData[monthYear], monthYear);
                }
            })
            .on("slideend", function(evt, value) {
                var monthYear = Object.keys(reportsData)[(reportsDataLength - 1) - Math.ceil(value)];
                displaySightings(reportsData[monthYear], monthYear);
            })
            .value(val);

        d3.select("#slider-div").remove();

        dateScale.range([0, d3.select("#slider-container2").node().offsetWidth - 100])

        d3.select("#slider-container2")
            .append("div")
            .attr("id", "slider-div")
            .style("width", dateScale.range()[1] + "px")
            .on("mousemove", sliderProbe)
            .on("mouseout", function() {
                d3.select("#slider-probe").style("display", "none");
            })
            .call(slider);

        d3.select("#slider-div a").on("mousemove", function() {
            d3.event.stopPropagation();
        })



        var sliderAxis = d3.svg.axis()
            .scale(dateScale)
            .tickValues(dateScale.ticks(Object.keys(reportsData).length).filter(function(d, i) {
                // ticks only for beginning of each year, plus first and last
                return d.getMonth() == 0 || i == 0 || i == Object.keys(reportsData).length - 1;
                // Less ticks
                // return (d.getFullYear()%2 == 0 && d.getMonth() == 0) || i == 0 || i == Object.keys(reportsData).length - 1;
            }))
            .tickFormat(function(d) {
                // abbreviated year for most, full month/year for the ends
                if (d.getMonth() == 0) return "'" + d.getFullYear().toString().substr(2);
                return months[d.getMonth() - 1] + " " + d.getFullYear();
            })
            .tickSize(10)

        d3.select("#axis").remove();

        d3.select("#slider-container2")
            .append("svg")
            .attr("id", "axis")
            .attr("width", "100%")
            .attr("height", 25)
            .append("g")
            .attr("transform", "translate(" + (50) + ",0)")
            .call(sliderAxis);

        d3.select("#axis > g g:first-child text").attr("text-anchor", "end").style("text-anchor", "end");
        d3.select("#axis > g g:last-of-type text").attr("text-anchor", "start").style("text-anchor", "start");

        var startValue = Object.keys(reportsData)[(reportsDataLength - 1)];
        displaySightings(reportsData[startValue], startValue);
    }

    function sliderProbe() {
        var d = dateScale.invert((d3.mouse(this)[0]));
        d3.select("#slider-probe")
            .style("left", d3.mouse(this)[0] + sliderMargin + "px")
            .style("display", "block")
            .select("p")
            .html(months[d.getMonth()] + " " + d.getFullYear())
    }

})
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    months_full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function createInfo(report) {
    var dateObj = new Date(report.date);
    $('#durationInfo').text(report.duration);
    var state = (report.state) ? ", " + report.state : "";
    $('#locationInfo').text(report.city + state);
    $('#shapeInfo').text(report.shape);
    $('#summaryInfo').text(report.summary);
    $('#dateInfo').text("On " + months_full[dateObj.getMonth()] + " " + dateObj.getDate() + ", " + dateObj.getFullYear() + " at")
    $('#timeInfo').text(dateObj.toLocaleTimeString(navigator.language, {
        hour: '2-digit',
        minute: '2-digit'
    }));
}


function createDateScale(columns) {
    var start = columns[columns.length - 1].split('/'),
        end = columns[0].split('/');
    return d3.time.scale()
        .domain([new Date(start[1], start[0]), new Date(end[1], end[0])]);
}

function sortProperties(obj) {
    // convert object into array
    var sortable = [];
    for (var key in obj)
        if (obj.hasOwnProperty(key))
            sortable.push([key, obj[key]]); // each item is an array in format [key, value]

        // sort items by value
    sortable.sort(function(a, b) {
        return b[1] - a[1]; // compare numbers
    });
    return sortable; // array in format [ [ key1, val1 ], [ key2, val2 ], ... ]
}
var lastHover = null;
var myBarChart = null;

function createShapeBarChart(shapeObject) {
    (myBarChart) ? myBarChart.destroy(): "";
    Chart.defaults.global.defaultFontFamily = "'Open Sans', sans-serif";
    Chart.defaults.global.defaultFontColor = '#4C97AA';
    Chart.defaults.global.defaultFontSize = 10;
    Chart.defaults.global.hover.onHover = function(el) {
        if (el.length > 0) {
            $("." + el[0]._model.label).css("fill", "#652133");
            lastHover = el[0]._model.label;
        } else {
            if (lastHover) {
                $("." + lastHover).css("fill", "#B2212B");
                lastHover = null;
            }

        }
    };
    var sorted = sortProperties(shapeObject);
    var shapes = [];
    var values = [];
    sorted.forEach(function(e) {
        shapes.push(e[0])
        values.push(e[1]);
    })
    var ctx = document.getElementById('shapeChart').getContext('2d');
    var data = {
        labels: shapes,
        datasets: [{
            label: "Shapes",
            backgroundColor: '#4C97AA',
            borderColor: '#62D1D1',
            borderWidth: 1,
            data: values,
        }]
    };

    var options = {
        tooltips: {
            enabled: false
        },
        legend: {
            display: false
        },
        scales: {
            xAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    }
    myBarChart = new Chart(ctx, {
        type: 'horizontalBar',
        data: data,
        options: options
    });
}
