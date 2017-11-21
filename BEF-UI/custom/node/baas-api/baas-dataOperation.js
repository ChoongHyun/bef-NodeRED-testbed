module.exports = function(RED) {
    "use strict";

    var request = require("request");

    function DB(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.on("input", function(msg) {
            node.status({fill:"blue", shape:"dot", text:"request a row"});
            var tableName = msg.tableName || config.tableName;
            var mainOption = config.mainOption;
            var subOption = config.subOption;
            var tdckey = msg.tdckey || config.tdckey;
            var payload = null;
            var url = null;

            switch (mainOption) {
                // GET (read)
                case "GET":
                    switch (subOption) {
                        case "all":
                            var skip = msg.skip || config.skip;
                            var limit = msg.limit || config.limit;

                            // https://apis.sktelecom.com/v1/baas/data/{tableName}?skip={skip}&limit={limit}
                            url = "https://apis.sktelecom.com/v1/baas/data/" + tableName + "?skip=" + skip + "&limit=" + limit;
                            break;

                        case "single":
                            var objectId = msg.objectId || config.objectId;

                            // https://apis.sktelecom.com/v1/baas/data/{tableName}/{objectId}
                            url = "https://apis.sktelecom.com/v1/baas/data/" + tableName + "/" + objectId;
                            break;

                        case "whereComp":
                            var where = msg.where || config.where;
                            var skip = msg.skip || config.skip;
                            var limit = msg.limit || config.limit;

                            // https://apis.sktelecom.com/v1/baas/data/{tableName}?where={where}&skip={skip}&limit={limit}
                            url = "https://apis.sktelecom.com/v1/baas/data/" + tableName + "?where=" + where +
                                "&skip=" + skip + "&limit=" + limit;
                            break;

                        case "count":
                            var count = msg.count || config.count;
                            var skip = msg.skip || config.skip;
                            var limit = msg.limit || config.limit;

                            // https://apis.sktelecom.com/v1/baas/data/{tableName}?count={count}&skip={skip}&limit={limit}
                            url = "https://apis.sktelecom.com/v1/baas/data/" + tableName + "?count=" + count + "&skip=" + skip + "&limit=" + limit;
                            break;

                        case "pointerRow":
                            var objectId = msg.objectId || config.objectId;
                            var include = msg.include || config.include;

                            // https://apis.sktelecom.com/v1/baas/data/{tableName}/{objectId}?include={include}
                            url = "https://apis.sktelecom.com/v1/baas/data/" + tableName + "/" + objectId + "?include=" + include;
                            break;
                    }
                    break;

                // POST (create)
                case "POST":
                    payload = msg.createData || config.createData;

                    // https://apis.sktelecom.com/v1/baas/data/{tableName}
                    url = "https://apis.sktelecom.com/v1/baas/data/" + tableName;
                    break;

                // PUT (modify)
                case "PUT":
                    var objectId = msg.objectId || config.objectId;
                    var colName;
                    var colValue;

                    // https://apis.sktelecom.com/v1/baas/data/{tableName}/{objectId}
                    url = "https://apis.sktelecom.com/v1/baas/data/" + tableName + "/" + objectId;

                    switch (subOption) {
                        case "modSingleRow":
                            payload = msg.modSingleRow || config.modSingleRow;
                            break;

                        case "incRow":
                            var rawData = {};
                            var longData = {};
                            longData["__op"] = "Increment";
                            colName = msg.colName_incRow || config.colName_incRow;
                            colValue = msg.colValue_incRow || config.colValue_incRow;
                            longData["amount"] = parseInt(colValue);
                            rawData[colName] = longData;
                            payload = JSON.stringify(rawData);
                            break;

                        case "arrayAdd":
                            var rawData = {};
                            var longData = {};
                            longData["__op"] = "Add";
                            colName = msg.colName_arrayAdd || config.colName_arrayAdd;
                            colValue = msg.colValue_arrayAdd || config.colValue_arrayAdd;
                            longData["objects"] = JSON.parse(colValue);
                            rawData[colName] = longData;
                            payload = JSON.stringify(rawData);
                            break;

                        case "uniqueArrayAdd":
                            var rawData = {};
                            var longData = {};
                            longData["__op"] = "AddUnique";
                            colName = msg.colName_uniqueArrayAdd || config.colName_uniqueArrayAdd;
                            colValue = msg.colValue_uniqueArrayAdd || config.colValue_uniqueArrayAdd;
                            longData["objects"] = JSON.parse(colValue);
                            rawData[colName] = longData;
                            payload = JSON.stringify(rawData);
                            break;

                        case "arrayDelete":
                            var rawData = {};
                            var longData = {};
                            colName = msg.colName_arrayDelete || config.colName_arrayDelete;
                            colValue = msg.colValue_arrayDelete || config.colValue_arrayDelete;
                            longData["__op"] = "Remove";
                            longData["objects"] = JSON.parse(colValue);
                            rawData[colName] = longData;
                            payload = JSON.stringify(rawData);
                            break;

                        case "relationAdd":
                            var rawData = {};
                            colName = msg.colName_relationAdd || config.colName_relationAdd;
                            colValue = msg.colValue_relationAdd || config.colValue_relationAdd;

                            var longData = {
                                "__op": "AddRelation",
                                "objects": [
                                    {
                                        "__type": "Relation",
                                        "dataName": colValue,
                                        "objectId": objectId
                                    }
                                ]
                            };
                            rawData[colName] = longData;
                            payload = JSON.stringify(rawData);
                            break;

                        case "relationDelete":
                            var rawData = {};
                            colName = msg.colName_relationDelete || config.colName_relationDelete;
                            colValue = msg.colValue_relationDelete || config.colValue_relationDelete;
                            var longData = {
                                "__op": "RemoveRelation",
                                "objects": [
                                    {
                                        "__type": "Relation",
                                        "dataName": colValue,
                                        "objectId": objectId
                                    }
                                ]
                            };
                            rawData[colName] = longData;
                            payload = JSON.stringify(rawData);
                            break;
                    }
                    break;
                // DELETE
                case "DELETE":
                    var objectId = msg.objectId || config.objectId;

                    // https://apis.sktelecom.com/v1/baas/data/{tableName}/{objectId}
                    url = "https://apis.sktelecom.com/v1/baas/data/" + tableName + "/" + objectId;
                    break;
            }

            request({
                method: mainOption,
                uri: url,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json;charset=utf-8',
                    TDCProjectKey: tdckey
                },
                body: payload
            }, function(error, response, body) {
                if (error || (response.statusCode != '200' && response.statusCode != '201') ) {
                    node.status({fill:"red",shape:"dot",text:body});
                    node.log("Request Param - uri: " + url + ", payload: " + JSON.stringify(payload, null, 4));
                    node.log("Skip: " + skip + ", Limit: " + limit);
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

    RED.nodes.registerType("baas-DB", DB);
}
