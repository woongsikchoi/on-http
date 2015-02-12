// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */
'use strict';

var di = require('di'),
    // TODO: re-enable
    //_ = require('lodash'),
    express = require('express'),
    cors = require('cors'),
    onFinished = require('on-finished');

/**
 * Get remote address of the client.
 * @private
 * @param {express.Request} req from express
 * @returns {String|Undefined} either the ip of requester or undefined
 *                             if unavailable
 */
function remoteAddress(req) {
    if (req.ip) {
        return req.ip;
    }

    if (req._remoteAddress) {
        return req._remoteAddress;
    }

    if (req.connection) {
        return req.connection.remoteAddress;
    }

    return undefined;
}

module.exports = httpServiceFactory;

di.annotate(httpServiceFactory, new di.Provide('Http.Server'));
di.annotate(httpServiceFactory,
    new di.Inject(
            'Protocol.Events',
            'Services.Configuration',
            'Services.Lookup',
            'SockJS.Server',
            'express-app',
            'Logger',
            'Tracer',
            'Q',
            'Assert'
        )
    );

/**
 * Factory that creates the express http service
 * @private
 * @param {httpProtocol} httpProtocol
 * @param {configuration} configuration
 * @param {Protocol.Dhcp} dhcpProtocol
 * @param {express} app
 * @param Logger
 * @param {WebSocketService} websocketService
 * @returns {express}
 */
function httpServiceFactory(
    eventsProtocol,
    configuration,
    lookupService,
    sockJsServer,
    app,
    Logger,
    tracer,
    Q
) {
    var logger = Logger.initialize(httpServiceFactory);
    var server;

    function httpEventMiddleware(req, res, next) {
        req._startAt = process.hrtime();
        var ipAddress = remoteAddress(req);

        onFinished(res, function () {
            if (!req._startAt) {
                return '';
            }

            var diff = process.hrtime(req._startAt),
                ms = diff[0] * 1e3 + diff[1] * 1e-6;

            lookupService.ipAddressToNodeId(ipAddress).then(function (nodeId) {
                logger.silly(
                    'http: ' + req.method +
                    ' ' + res.statusCode +
                    ' ' + ms.toFixed(3) +
                    ' - ' + req.originalUrl,
                    {
                        id: nodeId,
                        ipAddress: ipAddress
                    }
                );

                eventsProtocol.publishHttpResponse(
                    nodeId || 'external',
                    {
                        address: ipAddress,
                        method: req.method,
                        url: req.originalUrl,
                        statusCode: res.statusCode,
                        time: ms.toFixed(3)
                    }
                );

            }).catch(function (error) {
                logger.error('Error Looking Up IP -> Node', {
                    error: error
                });
            });
        });

        next();
    }

    app.use(tracer.middleware());

    // CORS Support
    app.use(cors());
    app.options('*', cors());

    // Imaging Event Middleware
    app.use(httpEventMiddleware);

    // Serve Static Content
    app.use(express.static(configuration.get('httpStaticDirectory')));
    app.use(express.static(configuration.get('httpFrontendDirectory')));
    app.use("/docs", express.static(configuration.get('httpApiDocsDirectory')));

    // Extend HTTP to include web sockets
    app.listen = function() {
      server = require('http').createServer(this);
      server.on('close', function() {
          console.log("HTTP server closing");
      });
      sockJsServer.listen(server);
      return server.listen.apply(server, arguments);
    };

    app.close = function() {
        return Q.ninvoke(server, 'close');
    };

    return app;
}