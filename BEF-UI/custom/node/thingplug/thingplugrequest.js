module.exports = function(RED) {
    "use strict";
    var request = require("request");

    function ThingPlugRequest(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.cacheHtml = null;

        //RED.nodes.registerType("ThingPlug Request", ThingPlugRequest, {    });

        var tpconfigData = RED.nodes.getNode(config.tpconfig).data;


        //TO-DO msg payload composing .. 
        /*
            var reqBody = {workspaceId: _workspaceId,
                applicationId:_applicationId,
                sender: config.sender || msg.sender,
                receiver:config.receiver || msg.receiver,
                contents:config.message || msg.message,
                subject:config.subject || msg.subject
            };
        */

        //url : http://onem2m.sktiot.com:9000/starterkittest/v1_0/remoteCSE-{{nodeid}}/container-LoRa/latest

        var url = "http://" + tpconfigData.tpHost + ":" + tpconfigData.tpPort + "/" +
                tpconfigData.appEUI + "/" + tpconfigData.version + "/remoteCSE-" +
                config.nodeid  + "/container-" + tpconfigData.containerName + "/latest";                

        var reqHeader = {headers:{
            Accept: 'application/json',
            ukey: config.ukey,
            'X-M2M-Origin': config.nodeid
        }};


        this.on("input",function (msg) {
            node.status({fill:"blue",shape:"dot",text:"thingplug command.status.requesting"});


            reqHeader.headers['X-M2M-RI'] =  config.nodeid + RED.util.generateId();

            node.status({fill:"blue",shape:"dot",text:"thingplug requesting"}); 

            request(url, reqHeader, function (error, response, body) {
                if (!error ){
                    if (response.statusCode == 200) {   
                        if (node.cacheHtml == null || node.cacheHtml != body) {
                            node.status({fill:"green",shape:"dot",text:"OK"});
                            node.cacheHtml = body;
                            msg.payload = JSON.parse(body);
                            node.send(msg);
                         }
                    } else {
                        node.status({fill:"red",shape:"dot",text:response.statusCode + " " + response.headers.rsm});
                        console.log("http return code [" + response.statusCode + "]   header[" + JSON.stringify(response.headers));                        
                    }
                } else {
                    node.status({fill:"red",shape:"dot",text: JSON.stringify(error)});
                    console.log("protocol fail [" + error + "]" );
                } 
            });

        });

        this.on("close",function() {
            node.status({});
        });
    }           
    RED.nodes.registerType("ThingPlug Request", ThingPlugRequest);

}



