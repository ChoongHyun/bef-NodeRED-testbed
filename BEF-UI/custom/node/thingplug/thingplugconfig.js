module.exports = function(RED) {
    "use strict";

    function ThingPlugConfig(config) {
        RED.nodes.createNode(this, config);
        this.data = {
            appEUI : config.appEUI,
            devEUI : config.devEUI,
            version : config.version,
            tpHost : config.tpHost,
            tpPort : config.tpPort,
            containerName : config.containerName
        };
    }

    RED.nodes.registerType("tp-config", ThingPlugConfig);
};