/**
 * Created by Anton on 05.04.2015.
 */

var util = require('util');
var winston = require('winston');
var http = require('http');
var https = require('https');

var T2C = exports.T2C = function (options) {
    winston.Transport.call(this, options);
    options = options || {};

    this.appCode = options.appCode;
    this.publicKey = options.publicKey;
    this.host = options.host || 'trace2cloud.com';
    this.method = options.method || 'put';
    this.ssl = options.ssl || false;
    this.port = options.port || (this.ssl ? 443 : 80);
    this.path = '/api/receiver';
};

util.inherits(T2C, winston.Transport);

//
// Expose the name of this Transport on the prototype
//
T2C.prototype.name = 't2c';

winston.transports.T2C = T2C;

/**
 * Core logging method exposed to Winston. Metadata is optional.
 * @level {string} Level at which to log the message.
 * @msg {string} Message to log
 * @meta {Object} **Optional** Additional metadata to attach
 * @callback {function} Continuation to respond to when complete.
 * */
T2C.prototype.log = function (level, msg, meta, callback) {
    var self = this;
    if (typeof meta === 'function') {
      callback = meta;
      meta = {};
    }

    var payload = {
        appCode: this.appCode,
        publicKey: this.publicKey,
        entries: [{
            level: level,
            message: msg
        }]
    };

    this.__request(payload, function (err, res) {
      if (res && res.statusCode !== 200) {
        err = new Error('HTTP Status Code: ' + res.statusCode);
      }

      if (err) return callback(err);

      // TODO: emit 'logged' correctly,
      // keep track of pending logs.
      self.emit('logged');

      if (callback) callback(null, true);
    });
};

/**
 * Make a request to a server.
 * */
T2C.prototype.__request = function(payload, callback) {
    // Prepare options for outgoing HTTP request
    req = (this.ssl ? https : http).request({
      host: this.host,
      port: this.port,
      path: '/' + this.path.replace(/^\//, ''),
      method: this.method,
      headers: { 'Content-Type': 'application/json' }
    });

    req.on('error', callback);
    req.on('response', function (res) {
      res.on('end', function () {
        callback(null, res);
      });

      res.resume();
    });

    req.end(new Buffer(JSON.stringify(payload), 'utf8'));
};
