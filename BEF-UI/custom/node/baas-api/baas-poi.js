module.exports = function(RED) {
    "use strict";

    var request = require("request");
    var fs = require('fs');

    function BaasNodePOI(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.on("input", function(msg) {
            node.status({fill:"blue", shape:"dot", text:"POI info"});

            var tableName = msg.tableName || config.tableName;
            var mainOption = config.mainOption;
            var subOption = config.subOption;
            var tdckey = msg.tdckey || config.tdckey;
            var payload = null;
            var url = null;
            var where = null;

            switch (mainOption) {
                case "GET":
                    switch (subOption) {
                        case "whereClose":
                            where = msg.whereClose || config.whereClose;
                            break;

                        case "whereRange":
                            where = msg.whereRange || config.whereRange;
                            break;

                        case "whereWithin":
                            where = msg.whereWithin || config.whereWithin;
                            break;
                    }

                    var skip = msg.skip || config.skip;
                    var limit = msg.limit || config.limit;
                    url = "https://apis.sktelecom.com/v1/baas/data/" + tableName + "?where=" + where + "&skip=" + skip + "&limit=" + limit;
                    break;

                case "POST":
                    url = "https://apis.sktelecom.com/v1/baas/data/" + tableName;
                    payload = msg.createData || config.createData;
                    break;
            }

            var requestParam = {
                method: mainOption,
                uri: url,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json;charset=utf-8',
                    TDCProjectKey: tdckey
                },
                body: payload
            }

            var req = request(requestParam, function(error, response, body) {
                if (error || response.statusCode != '200') {
                    node.status({fill:"red",shape:"dot",text:body});
                    node.log("Request Param: " + JSON.stringify(requestParam, null, 4));
                    return node.error(body);
                } else {
                    try {
                        body = JSON.parse(body);
                        node.status({});
                    } catch(ex) {
                        body = ex;
                    }
                }

                msg.payload = body;
                node.send(msg);
            } );
        } );

        this.on("close", function() {
            node.status({});
        });
    }

    RED.nodes.registerType("baas-poi", BaasNodePOI);
}
