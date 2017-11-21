module.exports = function(RED) {
    "use strict";
    var request = require("request");

    function ThingPlugCommand(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.commandType = config.cmt;

        var tpconfigData = RED.nodes.getNode(config.tpconfig).data;

        //url : http://onem2m.sktiot.com:9000/{{appEUI}}/{{version}}/mgmtCmd-{{nodeid}}_extDevMgmt
        var url = "http://" + tpconfigData.tpHost + ":" + tpconfigData.tpPort + "/" +
            tpconfigData.appEUI + "/" + tpconfigData.version + "/mgmtCmd-" +
            config.nodeid  + "_" + this.commandType;

        this.on("input",function (msg) {
            node.status({fill:"blue",shape:"dot",text:"thingplug command.status.requesting"});

            var reqBody = {mgc:{
                exra : config.cmd || msg.cmd,
                exe : true,
                cmt : this.commandType
            }};

            request({
                    method: 'PUT',
                    uri: url,
                    headers: {
                        Accept: 'application/json',
                        uKey: config.ukey,
                        'X-M2M-Origin': config.nodeid,
                        'X-M2M-RI': config.nodeid + '_' + RED.util.generateId(),
                        'Content-Type': 'application/json;ty=8'
                    },
                    body: JSON.stringify(reqBody)
                }, function(error, response, body) {
                    if (error) {
                        node.status({fill:"red",shape:"dot",text:"disconnected"});
                        return node.error('ThingPlug command Error', error);
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
                }

            );
        });

        this.on("close",function() {
            node.status({});
        });
    }
    RED.nodes.registerType("ThingPlug Command", ThingPlugCommand);
};
