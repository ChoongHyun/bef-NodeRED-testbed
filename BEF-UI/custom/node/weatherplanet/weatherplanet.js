module.exports = function(RED) {
    "use strict";
    var request = require("request");

    function WeatherPlanet(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.on("input",function (msg) {
            node.status({fill:"blue",shape:"dot",text:"request weather"});

            var lat = msg.lat || config.lat;
            var lon = msg.lon || config.lon;

           //url : http://apis.skplanetx.com/weather/summary?version={version}&lat={lat}&lon={lon}&stnid={stnid}
            var url = "http://apis.skplanetx.com/weather/summary?version=" + config.version 
            + "&lat=" + lat + "&lon=" + lon;

            request({
                method: 'GET',
                uri: url,
                headers: {
                    Accept: 'application/json',
                    'x-skpop-userId': config.userId, 
                    appKey: config.appKey
                }
            }, function(error, response, body) {
                    if (error || response.statusCode != '200') {
                        node.status({fill:"red",shape:"dot",text:body});
                        return node.error(body);
                    } else {
                        try {
                            body = JSON.parse(body);
                            node.status({});
                        } catch(ex) {
                            body = ex;
                        }
                    }
                    // node.log(JSON.stringify(error));
                    // node.log(JSON.stringify(response));
                    // node.log(JSON.stringify(body));
                    msg.payload = body;
                    node.send(msg);
               }

            );
        });

        this.on("close",function() {
            node.status({});
        });
    }
    RED.nodes.registerType("Weather Planet", WeatherPlanet);
};
