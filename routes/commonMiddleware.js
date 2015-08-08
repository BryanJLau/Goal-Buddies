var jwt = require('jsonwebtoken');
var config = require('../config');

// Middleware to sanitize against nosql attacks
exports.cleanBody = function (req, res, next) {
    req.body = sanitize(req.body);
    next();
}

// Middleware for mandatory token verification
exports.verifyToken = function (req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    
    // decode token
    if (token) {
        
        // verifies secret and checks exp
        jwt.verify(token, config.tokenSecret, function (err, decoded) {
            if (err) {
                res.status(HttpStatus.UNAUTHORIZED);
                res.json(
                    {
                        statusCode : HttpStatus.UNAUTHORIZED,
                        devError : "An invalid token was passed. Please make sure " +
                        "you save the access token verbatim, and that it has not changed " +
                        "since receiving it.",
                        error : "Failed to authenticate token.",
                    }
                );
            } else {
                if (decoded.exp <= Date.now()) {
                    res.end('Access token has expired', 400);
                    res.status(HttpStatus.UNAUTHORIZED);
                    res.json(
                        {
                            statusCode : HttpStatus.UNAUTHORIZED,
                            devError : "The token has expired. Please redirect the user " +
                            "to the login screen, or attempt another authentication on " +
                            "their behalf.",
                            error : "Your access token has expired. Please login again.",
                        }
                    );
                }
                else {
                    // if everything is good, save to request for use in other routes
                    req.user = decoded;     // Only the user is saved in the token
                    next();
                }
            }
        });

    } else {
        res.status(HttpStatus.UNAUTHORIZED);
        res.json(
            {
                statusCode : HttpStatus.UNAUTHORIZED,
                devError : "No token was passed. Please submit a token with " +
                "your request to this resource.",
                error : "Please contact your app developer to submit your " +
                "access token.",
            }
        );
    }
}

// Middleware for optional token existence
exports.checkToken = function (req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    
    // decode token
    if (token) {
        
        // verifies secret and checks exp
        jwt.verify(token, config.tokenSecret, function (err, decoded) {
            if (err || decoded.exp <= Date.now()) {
                req.user = null;
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