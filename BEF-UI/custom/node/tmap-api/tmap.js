module.exports = function(RED) {
    'use strict';
    var request = require("request");

    function geoCoding(config) {
        RED.nodes.createNode(this, config);
        this.method = config.method;
        this.appKey =  RED.nodes.getNode(config.appKey).key;

        this.coordType = config.coordType;
        var node = this;

        this.on("input",function (msg) {
            var url = "http://apis.skplanetx.com/tmap/geo/";
            var lat, lon;

            switch (node.method) {
                case "f":
                    var fullAddr = RED.util.evaluateNodeProperty(config.fullAddr,config.fullAddrType,this,msg);
                    url += "fullAddrGeo?version=1&coordType=" + node.coordType + "&fullAddr=" + encodeURI(fullAddr);
                    break;

                case "g":
                    var city_do = RED.util.evaluateNodeProperty(config.city_do,config.city_doType,this,msg);
                    var gu_gun = RED.util.evaluateNodeProperty(config.gu_gun,config.gu_gunType,this,msg);
                    var dong = RED.util.evaluateNodeProperty(config.dong,config.dongType,this,msg);
                    var bunji = RED.util.evaluateNodeProperty(config.bunji,config.bunjiType,this,msg);
                    var detailAddress = RED.util.evaluateNodeProperty(config.detailAddress,config.detailAddressType,this,msg);
                    url += "geocoding?version=1&coordType=" + node.coordType + "&city_do=" + encodeURI(city_do) +
                        "&gu_gun=" + encodeURI(gu_gun) + "&dong=" + encodeURI(dong) + "&bunji=" + bunji  +
                        "&detailAddress=" + encodeURI(detailAddress) + "&addressFlag=" + config.addressFlag;
                    break;

                case "r":
                    lat = RED.util.evaluateNodeProperty(config.lat,config.latType,this,msg);
                    lon = RED.util.evaluateNodeProperty(config.lon,config.lonType,this,msg);
                    url += "reversegeocoding?version=1&coordType=" + node.coordType + "&lat=" + lat + "&lon=" + lon;
                    break;

                case "t":
                    lat = RED.util.evaluateNodeProperty(config.lat,config.latType,this,msg);
                    lon = RED.util.evaluateNodeProperty(config.lon,config.lonType,this,msg);
                    url += "coordconvert?version=1&lat=" + lat + "&lon=" + lon + "&fromCoord=" + config.beforeCoordType +
                            "&toCoord=" + config.afterCoordType;
                    break;
            }
            url += "&appKey=" + node.appKey;

            var payload = msg.payload;
            msg.payload = {};
            msg.payload = payload;

            node.status({fill:"blue",shape:"dot",text:"Search TMap..."});
            request({
                    method: 'GET',
                    uri: url,
                    headers: {
                        Accept: 'application/json'
                    }
                }, function(error, response, body) {
                    if (error || response.statusCode !== 200) {
                        node.status({fill:"red",shape:"dot",text:body});
                        return node.error(body);
                    } else {
                        try {
                            var respJSON = JSON.parse(body);
                            node.status({});
                            switch (node.method) {
                                case "f":
                                    var coorinate = respJSON.coordinateInfo.coordinate[0];
                                    msg.lat = coorinate.newLat || coorinate.lat;
                                    msg.lon = coorinate.newLon || coorinate.lon;
                                    break;
                                case "g":
                                    msg.lat = respJSON.coordinateInfo.newLat || respJSON.coordinateInfo.lat;
                                    msg.lon = respJSON.coordinateInfo.newLon || respJSON.coordinateInfo.lon;
                                    break;
                                case "r":
                                    msg.address = respJSON.addressInfo;
                                    break;
                                case "t":
                                    msg.lat = respJSON.coordinate.lat;
                                    msg.lon = respJSON.coordinate.lon;
                                    break;
                            }
                        } catch(ex) {
                            console.error(ex);
                            node.status({fill:"red",shape:"dot",text:ex});
                        }
                    }

                    node.send(msg);
                }
            );
        });

        this.on("close",function() {
            node.status({});
        });
    }

    function addressConverter(config) {
        RED.nodes.createNode(this, config);
        this.appKey =  RED.nodes.getNode(config.appKey).key;
        this.coordType = config.coordType;
        var node = this;

        this.on("input",function (msg) {
            var reqAdd = RED.util.evaluateNodeProperty(config.reqAdd,config.reqAddType,this,msg);
            var url = "https://apis.skplanetx.com/tmap/geo/convertAddress?version=1&searchTypCd=" + config.convert +
                    "&reqAdd=" + encodeURI(reqAdd) + "&resCoordType=" + node.coordType + "&appKey=" + node.appKey;

            node.status({fill:"blue",shape:"dot",text:"Address Converting..."});
            request({
                    method: 'GET',
                    uri: url,
                    headers: {
                        Accept: 'application/json'
                    }
                }, function(error, response, body) {
                    if (error || response.statusCode !== 200) {
                        if (response.statusCode === 204) {
                            node.status({fill: "red", shape: "dot", text: "잘못된 주소 혹은 변환 불가능한 주소입니다."});
                            return node.error("Invalid Address or Not found");
                        } else {
                            node.status({fill: "red", shape: "dot", text: body});
                            return node.error(body);
                        }
                    } else {
                        try {
                            var respJSON = JSON.parse(body);
                            node.status({});
                            msg.address = respJSON.ConvertAdd;
                        } catch(ex) {
                            node.status({fill:"red",shape:"dot",text:ex});
                        }
                    }

                    node.send(msg);
                }
            );
        });

        this.on("close",function() {
            node.status({});
        });
    }

    function tmapTemplate(config) {
        RED.nodes.createNode(this, config);
        this.appKey =  RED.nodes.getNode(config.appKey).key;
        this.coordType = config.coordType;
        var node = this;

        this.on("input",function (msg) {
            var lat = RED.util.evaluateNodeProperty(config.lat,config.latType,this,msg);
            var lon = RED.util.evaluateNodeProperty(config.lon,config.lonType,this,msg);

            var cLonlat;

            if (node.coordType === "WGS84GEO") {
                cLonlat = '\n\
                // transform lon / lan ( EPSG:4326 -> EPSG:3857 ) \n\
                var pr_4326 = new Tmap.Projection("EPSG:4326"); \n\
                var pr_3857 = new Tmap.Projection("EPSG:3857"); \n\
                centerLonLat = new Tmap.LonLat("' + lon + '", "' + lat + '").transform(pr_4326, pr_3857);';
            } else {
                cLonlat = '                centerLonLat = new Tmap.LonLat("' + lon + '", "' + lat + '");';
            }

            msg.payload = '<!DOCTYPE html>\n\
<html>\n\
    <head>\n\
        <meta charset="utf-8"/>\n\
        <title>T-Map Template</title>\n\
        <style>\n\
            html, body, #map-canvas {\n\
                height: 99%;\n\
            }\n\
        </style>\n\
        <script src="https://apis.skplanetx.com/tmap/js?version=1&format=javascript&appKey=' + node.appKey + '"></script>\n\
\n\
        <script>\n\
            var map;\n\
            var centerLonLat;\n\
            var markerLayer;\n\
        \n\
            var zoom = 16;  \n\
            var mapW = "99%";\n\
            var mapH = "99%";\n\
            \n\
            function initTMap() {\n\
' + cLonlat + '\n\
                // setup tmap\n\
                map = new Tmap.Map({div:"map_div", width:mapW, height:mapH, animation:true}); \n\
                map.setCenter(centerLonLat,zoom);\n\
        \n\
                // add MarkerLyer\n\
                markerLayer = new Tmap.Layer.Markers("MarkerLayer");\n\
                map.addLayer(markerLayer);\n\
\n\
                addMyLocation();\n\
            }\n\
\n\
            function addMyLocation() {\n\
        		var size = new Tmap.Size(24,38);\n\
        		var offset = new Tmap.Pixel(-(size.w/2), -size.h);\n\
        		var hereIcon = new Tmap.Icon("https://developers.skplanetx.com/upload/tmap/marker/pin_b_s_simple.png", size, offset);  \n\
\n\
        		var marker = new Tmap.Markers(centerLonLat, hereIcon, new Tmap.Label("여기"));\n\
        		markerLayer.addMarker(marker);\n\
        		marker.popup.show();\n\
            }\n\
        </script>\n\
    </head>\n\
    <body onload="initTMap()">\n\
        <div id="map_div" style="border: 1px solid black; margin: 0 auto !important;"></div>\n\
    </body>\n\
</html>';
            node.send(msg);
        });

        this.on("close",function() {
            node.status({});
        });
    }

    function tmapAppKey(config) {
        RED.nodes.createNode(this, config);
        this.key = config.key;
    }

    RED.nodes.registerType("tmapAppKey", tmapAppKey);
    RED.nodes.registerType("geoCoding", geoCoding);
    RED.nodes.registerType("addressConverter", addressConverter);
    RED.nodes.registerType("tmapTemplate", tmapTemplate);
};
