var jwt = require('jsonwebtoken');
var sanitize = require('mongo-sanitize');
var config = require('../config');
var errorHandler = require('../lib/errorHandler');

// Middleware to sanitize against nosql attacks
exports.cleanBody = function (req, res, next) {
    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    next();
}

// Middleware for mandatory token verification
exports.verifyToken = function (req, res, next) {
    // check header or url parameters or post parameters for token
    var token =
        req.body.token || req.query.token || req.headers['x-access-token'];
	
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, config.tokenSecret, function (err, decoded) {
            if (err) {
                // Something is wrong with the token
                errorHandler.invalidToken(res);
            } else {
                // The expiration time is in seconds, decoded token in ms
                if ((decoded.exp * 1000) <= Date.now()) {
                    errorHandler.expiredToken(res);
                }
                else {
                    // Save the user in the request and move on
                    req.user = decoded;     // Only user is saved in token
                    next();
                }
            }
        });

    } else {
        // No token
        errorHandler.tokenNotFound(res);
    }
}

// Middleware for optional token existence
exports.checkToken = function (req, res, next) {
    // check header or url parameters or post parameters for token
    var token =
        req.body.token || req.query.token || req.headers['x-access-token'];
    
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, config.tokenSecret, function (err, decoded) {
            if (err || decoded.exp * 1000 <= Date.now()) {
                req.user = null;    // User isn't required, set to null
                next();
            }
            else {
                req.user = decoded;
                next();
            }
        });

    } else {
        req.user = null;
        next();
    }
}

// Not exactly middleware, but common to all functions
