// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

describe('Pollers API', function () {
    var taskProtocol;
    before(function () {
        taskProtocol = {
            requestPollerCache: sinon.stub()
        };
        return helper.startServer([
            dihelper.simpleWrapper(taskProtocol, 'Protocol.Task')
        ]);
    });

    beforeEach(function () {
        return helper.reset();
    });

    after(function () {
        return helper.stopServer();
    });

    it('should return an empty array from GET /pollers', function () {
        return helper.request().get('/api/common/pollers')
            .expect('Content-Type', /^application\/json/)
            .expect(200, []);
    });

    it('should create an IPMI poller with POST /pollers', function () {
        return helper.request().post('/api/common/pollers')
            .send({
                type: 'ipmi',
                pollInterval: 5000,
                config: {
                    command: 'sdr',
                    host: '0.0.0.0',
                    user: 'myuser',
                    password: 'mypass'
                }
            })
            .expect('Content-Type', /^application\/json/)
            .expect(200)
            .expect(function (res) {
                expect(res.body).to.have.property('type', 'ipmi');
                expect(res.body).to.have.property('node', null);
                expect(res.body).to.have.property('failureCount', 0);
                expect(res.body).to.have.property('pollInterval', 5000);
                expect(res.body).to.have.property('config').to.be.an('object');
                expect(res.body).to.have.deep.property('config.command', 'sdr');
                expect(res.body).to.have.deep.property('config.host', '0.0.0.0');
                expect(res.body).to.have.deep.property('config.user', 'myuser');
                expect(res.body).to.have.deep.property('config.password', 'mypass');
                expect(res.body).to.have.property('id').to.be.a('string');
                expect(res.body).to.have.property('createdAt').to.be.a('string');
                expect(res.body).to.have.property('updatedAt').to.be.a('string');
                expect(res.body).to.have.property('lastStarted', null);
                expect(res.body).to.have.property('lastFinished', null);
            });
    });

    it('should create an SNMP poller with POST /pollers', function () {
        return helper.request().post('/api/common/pollers')
            .send({
                type: 'snmp',
                pollInterval: 6000,
                config: {
                    host: '0.0.0.0',
                    communityString: 'public',
                    extensionMibs: [
                        'PowerNet-MIB::rPDULoadDevMaxPhaseLoad', // max load for this PDU
                        'PowerNet-MIB::sPDUOutletCtl', // state of each outlet (1 on, 2 off)
                        'PowerNet-MIB::rPDULoadStatusLoad', // current in 10ths of amps
                        'PowerNet-MIB::rPDUIdentDeviceLinetoLineVoltage' // voltage
                    ]
                }
            })
            .expect('Content-Type', /^application\/json/)
            .expect(200)
            .expect(function (res) {
                expect(res.body).to.have.property('type', 'snmp');
                expect(res.body).to.have.property('node', null);
                expect(res.body).to.have.property('failureCount', 0);
                expect(res.body).to.have.property('pollInterval', 6000);
                expect(res.body).to.have.property('config').to.be.an('object');
                expect(res.body).to.have.deep.property('config.host', '0.0.0.0');
                expect(res.body).to.have.deep.property('config.communityString', 'public');

                expect(res.body).to.have.deep.property('config.extensionMibs')
                    .to.be.an.instanceOf(Array);

                expect(res.body).to.have.deep.property('config.extensionMibs')
                    .with.length(4)
                    .and.to.include('PowerNet-MIB::rPDULoadDevMaxPhaseLoad')
                    .and.to.include('PowerNet-MIB::sPDUOutletCtl')
                    .and.to.include('PowerNet-MIB::rPDULoadStatusLoad')
                    .and.to.include('PowerNet-MIB::rPDUIdentDeviceLinetoLineVoltage');

                expect(res.body).to.have.property('id').to.be.a('string');
                expect(res.body).to.have.property('createdAt').to.be.a('string');
                expect(res.body).to.have.property('updatedAt').to.be.a('string');
                expect(res.body).to.have.property('lastStarted', null);
                expect(res.body).to.have.property('lastFinished', null);
            });
    });

    // TODO: probably change this later to not just be a static check
    var library = [
        {
        name: 'ipmi',
        node: true,
        config: [
            {
            key: 'host',
            type: 'string'
        },
        {
            key: 'user',
            type: 'string',
            defaultsTo: 'admin'
        },
        {
            key: 'password',
            type: 'string',
            defaultsTo: 'admin'
        },
        {
            key: 'alerts',
            type: 'json',
            required: false
        }
        ]
    },
    {
        name: 'snmp',
        config: [
            {
            key: 'host',
            type: 'string',
            required: true
        },
        {
            key: 'communityString',
            type: 'string',
            required: true
        },
        {
            key: 'extensionMibs',
            type: 'string[]'
        }
        ]
    }
    ];

    it('should retrieve the library with GET /pollers/library', function () {
        return helper.request().get('/api/common/pollers/library')
            .expect('Content-Type', /^application\/json/)
            .expect(200, library);
    });

    it('should retrieve the ipmi library entry with GET /pollers/library/ipmi', function () {
        return helper.request().get('/api/common/pollers/library/ipmi')
            .expect('Content-Type', /^application\/json/)
            .expect(200, library[0]);
    });

    it('should retrieve the snmp library entry with GET /pollers/library/snmp', function () {
        return helper.request().get('/api/common/pollers/library/snmp')
            .expect('Content-Type', /^application\/json/)
            .expect(200, library[1]);
    });

    describe('non-existent node id', function () {
        var badId = 'bad';
        it('should 404 with GET /pollers/:id ', function () {
            return helper.request().get('/api/common/pollers/' + badId)
            .expect(404);
        });

        it('should 404 with PATCH /pollers/:id', function () {
            return helper.request().patch('/api/common/pollers/' + badId)
            .send()
            .expect(404);
        });

        it('should 404 with DELETE /pollers/:id', function () {
            return helper.request().delete('/api/common/pollers/' + badId)
            .expect(404);
        });
    });

    describe('POST /pollers afterwards', function () {
        var poller;
        beforeEach(function () {
           return helper.request().post('/api/common/pollers')
            .send({ type: 'ipmi', pollInterval: 5000 })
            .expect('Content-Type', /^application\/json/)
            .expect(200)
            .then(function (req) {
                poller = req.body;
            });
        });
        it('should contain the new poller in GET /pollers', function () {
            return helper.request().get('/api/common/pollers')
            .expect('Content-Type', /^application\/json/)
            .expect(200, [poller]);
        });

        it('should return the same poller from GET /pollers/:id', function () {
            return helper.request().get('/api/common/pollers/' + poller.id)
            .expect('Content-Type', /^application\/json/)
            .expect(200, poller);
        });

        it(' should update with PATCH /pollers', function () {
            poller.pollInterval = 20000;
            return helper.request().patch('/api/common/pollers/' + poller.id)
            .send(poller)
            .expect('Content-Type', /^application\/json/)
            .expect(200)
            .expect(function (res) {
                expect(res.body).to.have.property('pollInterval', 20000);
                // should not have updated anything else
                expect(res.body).to.have.property('type', poller.type);
                expect(res.body).to.have.property('node', poller.node);
                expect(res.body).to.have.property('failureCount', poller.failureCount);
                expect(res.body).to.have.property('config').to.be.an('object');
                expect(res.body).to.have.property('config').to.be.empty;
                expect(res.body).to.have.property('id', poller.id);
                expect(res.body).to.have.property('createdAt', poller.createdAt);
                expect(res.body).to.have.property('updatedAt')
                .to.not.equal(poller.updatedAt);
                expect(res.body).to.have.property('lastStarted', poller.lastStarted);
                expect(res.body).to.have.property('lastFinished', poller.lastFinished);
            });
        });

        it('should delete the poller with DELETE /pollers/:id', function () {
            return helper.request().delete('/api/common/pollers/' + poller.id)
                .expect(204);
        });

        it('should return poller data from GET /pollers/:id/data', function () {
            var mockPollerData = [ { data: 'dummy' } ];
            taskProtocol.requestPollerCache.returns(Q.resolve(mockPollerData));
            return helper.request().get('/api/common/pollers/' + poller.id + '/data')
            .expect('Content-Type', /^application\/json/)
            .expect(200, mockPollerData);
        });
    });

});