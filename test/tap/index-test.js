'use strict';

const test = require('tap').test;
const sandbox = require('@log4js-node/sandboxed-module');
const appender = require('../../lib');

function setupLogging(category, options) {
  const fakeDgram = {
    createSocket: function (type) {
      fakeDgram.type = type;
      return {
        send: function (buffer, start, end, port, host, cb) {
          fakeDgram.buffer = buffer;
          fakeDgram.start = start;
          fakeDgram.end = end;
          fakeDgram.port = port;
          fakeDgram.host = host;
          fakeDgram.cb = cb;
        }
      };
    }
  };

  const fakeConsole = {
    error: function (msg, err) {
      this.msg = msg;
      this.err = err;
    }
  };

  const appenderModule = sandbox.require('../../lib', {
    requires: {
      dgram: fakeDgram
    },
    globals: {
      console: fakeConsole
    }
  });

  const log4js = sandbox.require('log4js', {
    requires: {
      '@log4js-node/logfaces-udp': appenderModule
    },
    ignoreMissing: true
  });

  options.type = '@log4js-node/logfaces-udp';
  log4js.configure({
    appenders: {
      udp: options
    },
    categories: { default: { appenders: ['udp'], level: 'trace' } }
  });

  return {
    logger: log4js.getLogger(category),
    dgram: fakeDgram,
    console: fakeConsole
  };
}

test('logFaces appender', (batch) => {
  batch.test('should export a configure function', (t) => {
    t.type(appender.configure, 'function');
    t.end();
  });

  batch.test('when using UDP receivers', (t) => {
    const setup = setupLogging('udpCategory', {
      application: 'LFS-UDP',
      remoteHost: '127.0.0.1',
      port: 55201
    });

    setup.logger.addContext('foo', 'bar');
    setup.logger.addContext('bar', 'foo');
    setup.logger.error('Log event #2');

    t.test('an event should be sent', (assert) => {
      const event = JSON.parse(setup.dgram.buffer.toString());
      assert.equal(event.a, 'LFS-UDP');
      assert.equal(event.m, 'Log event #2');
      assert.equal(event.g, 'udpCategory');
      assert.equal(event.p, 'ERROR');
      assert.equal(event.p_foo, 'bar');
      assert.equal(event.p_bar, 'foo');

      // Assert timestamp, up to hours resolution.
      const date = new Date(event.t);
      assert.equal(
        date.toISOString().substring(0, 14),
        new Date().toISOString().substring(0, 14)
      );
      assert.end();
    });

    t.test('dgram errors should be sent to console.error', (assert) => {
      setup.dgram.cb('something went wrong');
      assert.equal(setup.console.msg, 'log4js.logFacesUDPAppender error sending to 127.0.0.1:55201, error: ');
      assert.equal(setup.console.err, 'something went wrong');
      assert.end();
    });
    t.end();
  });

  batch.test('errors should be serialised correctly', (t) => {
    const setup = setupLogging('udpCategory', {
      application: 'LFS-UDP',
      remoteHost: '127.0.0.1',
      port: 55201
    });

    setup.logger.error('oh no', new Error('that thing happened again'));
    setup.dgram.cb();
    const event = JSON.parse(setup.dgram.buffer.toString());
    t.match(event.m, /Error: that thing happened again/);
    t.match(event.m, /at Test.batch.test/);
    t.end();
  });

  batch.test('should use default values', (t) => {
    const setup = setupLogging('default values', {});
    setup.logger.info('this should still work');
    const event = JSON.parse(setup.dgram.buffer.toString());

    t.equal(setup.dgram.port, 55201);
    t.equal(setup.dgram.host, '127.0.0.1');
    t.equal(event.a, '');
    t.end();
  });

  batch.end();
});
