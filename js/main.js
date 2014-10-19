var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var map;

window.currentStep = 0;

function getDistanceFromLatLonInM(lat1,lon1,lat2,lon2) {
    var R = 6371000; // Radius of the earth in m
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1);
    var a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in m
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180)
}



function initialize() {
    directionsDisplay = new google.maps.DirectionsRenderer();
    var geocoder = new google.maps.Geocoder();
    var _this = this;
    geocoder.geocode({'address': 'Birmingham New Street Station'}, function(result, status) {
        _this.origin = result[0].geometry.location;
        geocoder.geocode({'address': 'Birmingham The ICC'}, function(result, status) {
            _this.destination = result[0].geometry.location;
            var originPoint = new google.maps.LatLng(_this.origin.k, _this.origin.B);
            var mapOptions = {
                zoom:15,
                center: originPoint
            };
            map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
            directionsDisplay.setMap(map);
            var request = {
                origin:_this.origin,
                destination:_this.destination,
                travelMode: google.maps.TravelMode.WALKING
            };

            directionsService.route(request, function(response, status) {
                var steps = response.routes[0].legs[0].steps
                var currentPositionMarkers = new Array();

                var addCurrentPositionMarker = function(step) {
                    var marker = new google.maps.Marker({
                        position: step.startLocation,
                        map: map,
                        icon: "/images/man.png"
                    });
                }

                var showImage = function(pois) {
                    if (pois.length > 0) {
                        $("#next-step-image").css('background-image', 'url(' + pois[0].image_url + ')');
                    }
                }


                var contentForPOI = function(poi) {
                    var content = "<div><h2>"+ poi.name;
                    if (poi.category) {
                        content += " <span>("+ poi.category + ")</span></h2>";
                    } else {
                        content += "</h2>";
                    }
                    if (poi.owner) {
                        content += "<h3>" + poi.owner + "</h3>";
                    }
                    content += "</div>"
                    return content;
                }


                var showInfoView = function(pois) {
                    if (pois.length > 0) {
                        $("#next-step-image .infoview").html(contentForPOI(pois[0]));
                    }
                }


                var displayStep = function(stepIdx) {
                    var currentStep = steps[stepIdx]
                    if (currentStep.pois) {
                        showImage(currentStep.pois);
                    } else {
                        $.get('/api/v1/lookup.json?lat=' + currentStep.start_location.k + "&lon=" + currentStep.start_location.B, function() {
                        }).done(function(res) {
                            currentStep.pois = res;
                            showImage(res);
                            showInfoView(res);
                        })
                    }
                    $("#step").html("<div class='"+currentStep.maneuver+"'>"+currentStep.instructions+"</div>");
                    addCurrentPositionMarker(currentStep);

                }


                displayStep(0);
                $("#next").click(function(e) {
                    if (window.currentStep < steps.length) {
                        window.currentStep += 1
                        displayStep(window.currentStep);
                    }
                });
                $("#previous").click(function() {
                    if (window.currentStep > 0) {
                        window.currentStep -= 1;
                        displayStep(window.currentStep);
                    }
                });
                _.each(response.routes[0].overview_path, function(path) {
                    $.get('/api/v1/lookup.json?lat=' + path.k + "&lon=" + path.B, function() {
                    }).done(function(res) {
                        _.each(res, function(poi) {
                            if (poi) {
                                var title = poi.name;
                                var owner = poi.owner;
                                var category = poi.category
                                var latLong = new google.maps.LatLng(poi.lat, poi.lon);
                                var content = "<div class='infoview'><h2>"+title+"<span> ("+category+")</span></h2><h3>"+owner+"</h3></div>";
                                var marker = new google.maps.Marker({
                                    position: latLong,
                                    map: map,
                                    title: title,
                                    poi: poi
                                });
                                google.maps.event.addListener(marker, 'click', function() {
                                    $("#next-step-image").css('background-image', 'url(' + poi.image_url + ')');
                                    $(".infoview").html(contentForPOI(poi));
                                });

                            }

                        });
                    }).fail(function(data) {
                    })

                })

                    if (status == google.maps.DirectionsStatus.OK) {
                        directionsDisplay.setDirections(response);
                    }
            });
        })
    });
}

google.maps.event.addDomListener(window, 'load', initialize);
