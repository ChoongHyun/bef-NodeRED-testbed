module.exports = function(RED) {
    "use strict";

    var request = require("request");
    var fs = require('fs');

    function BaasNodeFile(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.on("input", function(msg) {
            node.status({fill:"blue", shape:"dot", text:"Upload file"});

            var url = "https://apis.sktelecom.com/v1/baas/files";
            var tdckey = msg.tdckey || config.tdckey;
            var mainOption = config.mainOption;
            var myfile;
            var requestParam;

            switch (mainOption) {
                case "GET":
                    var skip = msg.skip || config.skip;
                    var limit = msg.limit || config.limit;
                    url = url + "?skip=" + skip + "&limit=" + limit;
                    var requestParam = {
                        method: mainOption,
                        uri: url,
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json;charset=utf-8',
                            TDCProjectKey: tdckey
                        }
                    }
                    break;

                case "POST":
                    myfile = msg.myfile || config.myfile;
                    var formData = {
                        'uploadfile': fs.createReadStream(myfile)
                    };
                    var requestParam = {
                        method: mainOption,
                        uri: url,
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'multipart/form-data; charset=utf-8',
                            TDCProjectKey: tdckey
                        },
                        formData: formData
                    };
                    break;
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

    RED.nodes.registerType("baas-file", BaasNodeFile);
};
