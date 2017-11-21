module.exports = function(RED) {
    "use strict";
    var request = require("request");

    // hostname : bef-{userid}-{workspaceId}-{applicationId}-{random}-{random}
    var hostname = require('os').hostname();
    var hostnameComponents = hostname.split('-');

    var workspaceId = 'unknown';
    var applicationId = 'unknown';

    if (hostnameComponents.length > 3) {
        workspaceId = hostnameComponents[2];
        applicationId = hostnameComponents[3];
    }

    function VariableSet(config) {
        RED.nodes.createNode(this, config);
        this.valueName = config.valueName;
        this.value = config.value;
        this.valueType = config.valueType;
        this.scope = config.scope;
        var node = this;

        this.on("input",function (msg) {
            node.status({fill:"blue",shape:"dot",text:"set value in storage"});
            var value = RED.util.evaluateNodeProperty(this.value,this.valueType,this,msg);

            var url = process.env.FEATURE_SERVICE + "/api/v1/workspaces/" + workspaceId;
            if (this.scope == 'a') {
                url += '/applications/' + applicationId;
            }
            url += '/variables';

            request({
                    method: 'PUT',
                    uri: url,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: JSON.stringify({
                        "name": this.valueName,
                        "value": value
                    })
                }, function(error, response, body) {
                    if (error || response.statusCode != '200') {
                        node.status({fill:"red",shape:"dot",text:body});
                        return node.error("Variable set error : " + error);
                    } else {
                        try {
                            node.status({});
                        } catch(ex) {
                            node.status({fill:"red",shape:"dot",text:body});
                            return node.error("Variable set exception : " + error);
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
    RED.nodes.registerType("Variable Set", VariableSet);

    function VariableGet(config) {
        RED.nodes.createNode(this, config);
        this.valueName = config.valueName;
        this.saveTo = config.saveTo;
        this.valueType = config.valueType;
        this.scope = config.scope;
        var node = this;

        this.on("input",function (msg) {
            node.status({fill:"blue",shape:"dot",text:"set value in storage"});

            var url = process.env.FEATURE_SERVICE + "/api/v1/workspaces/" + workspaceId;
            if (this.scope == 'a') {
                url += '/applications/' + applicationId;
            }

            url += '/variables/' + node.valueName + '/value';

            request({
                method: 'GET',
                uri: url
            }, function(error, response, body) {
                if (!error && response.statusCode == '200') {
                    try {
                        if (node.valueType === 'msg') {
                            msg[node.saveTo] = body;
                        } else if (node.valueType === 'flow') {
                            node.context().flow.set(node.saveTo, body);
                        } else if (node.valueType === 'global') {
                            node.context().global.set(node.saveTo, body);
                        }
                        node.send(msg);
                        node.status({});

                    } catch (ex) {
                        node.status({fill: "red", shape: "dot", text: ex});
                        return node.error("Variable get Exception : " + error);
                    }
                } else {
                    node.status({fill: "red", shape: "dot", text: body});
                    return node.error("Variable get error : " + error);
                }

            })
        });

        this.on("close",function() {
            node.status({});
        });
    }
    RED.nodes.registerType("Variable Get", VariableGet);
};