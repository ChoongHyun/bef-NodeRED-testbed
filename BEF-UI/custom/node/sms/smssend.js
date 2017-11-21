module.exports = function(RED) {
    "use strict";
    var request = require("request");

    function SMSSend(config) {
        RED.nodes.createNode(this, config);
        var node = this;


        // hostname : bef-{userid}-{workspaceId}-{applicationId}-{random}-{random} TODO Maybe Fix

        var hostname = require('os').hostname();
        var hostnameComponents = hostname.split('-');
        var _workspaceId;
        var _applicationId;

        if (hostnameComponents.length > 3) {
            _workspaceId = hostnameComponents[2];
            _applicationId = hostnameComponents[3];
        } else {
            _workspaceId = 1;
            _applicationId = 1;

        }

        // url setting 
        // var url =  "http://localhost:8060/api/v1/smssend/free-user"
        var url = process.env.FEATURE_SERVICE + "/api/v1/smssend/free-user";

        this.on("input",function (msg) {

            node.status({fill:"blue",shape:"dot",text:"sms requesting"});

            var reqBody = {workspaceId: _workspaceId,
                applicationId:_applicationId,
                sender: config.sender || msg.sender,
                receiver:config.receiver || msg.receiver,
                contents:config.message || msg.message,
                subject:config.subject || msg.subject
            };

            console.log("url:" + url);
            console.log(reqBody);

            request({
                    method: 'POST',
                    uri: url,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json;charset=utf-8'
                    },
                    body: JSON.stringify(reqBody)

                },  function(error, response, body) {
                    if (error) {
                        node.status({fill:"red",shape:"dot",text:"disconnected"});
                        return node.error('SMS Send Error', error);
                    } else if( body.indexOf("CREATED") > -1 ){
                        node.status({});
                    } else if( body.indexOf("LIMIT") > -1 ){
                        node.status({fill:"red",shape:"dot",text:"daily limit over!!"});
                    }

                    msg.payload = body;
                    node.send(msg);
                }

            );
        });

        /* Feature service use logic END */

        this.on("close",function() {
            node.status({});
        });

    }

    RED.nodes.registerType("SMS Send", SMSSend);
};
