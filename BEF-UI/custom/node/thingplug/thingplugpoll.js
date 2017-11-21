module.exports = function(RED) {
    "use strict";
    var request = require("request");

    function ThingPlugPoll(config) {
        RED.nodes.createNode(this, config);
        this.active = config.active;
        var node = this;

        config.interval = parseInt(config.interval);
        node.intervalId = null;
        node.cacheHtml = null;
        runInterval(null, node, config);

        node.on("close", function() {
            if (this.intervalId != null) {
                clearInterval(this.intervalId);
            }
        });
    }
    RED.nodes.registerType("ThingPlug Poll", ThingPlugPoll, {

    });

    RED.httpAdmin.post("/tp-poll/:id/:state", RED.auth.needsPermission("tp-poll.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        var state = req.params.state;
        if (node !== null && typeof node !== "undefined" ) {
            if (state === "enable") {
                node.active = true;
                res.sendStatus(200);
            } else if (state === "disable") {
                node.active = false;
                res.sendStatus(201);
            } else {
                res.sendStatus(404);
            }
        } else {    
            res.sendStatus(404);
        }
    });

    function runInterval(msg, node, config) {
        if (node.intervalId != null) {
            clearInterval(node.intervalId);
        }

        var tpconfigData = RED.nodes.getNode(config.tpconfig).data;

        //url : http://onem2m.sktiot.com:9000/starterkittest/v1_0/remoteCSE-{{nodeid}}/container-LoRa/latest
        var url = "http://" + tpconfigData.tpHost + ":" + tpconfigData.tpPort + "/" +
                tpconfigData.appEUI + "/" + tpconfigData.version + "/remoteCSE-" +
                config.nodeid  + "/container-" + tpconfigData.containerName + "/latest";                

        var reqHeader = {headers:{
            Accept: 'application/json',
            ukey: config.ukey,
            'X-M2M-Origin': config.nodeid
        }};

        node.intervalId = setInterval(function() {
            if (node.active == false) return;
            if (msg == null) msg = {};

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

        }, parseInt(config.interval) * 1000);
    }
}



