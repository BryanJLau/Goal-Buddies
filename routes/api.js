var express = require('express');
var HttpStatus = require('http-status-codes');
var router = express.Router();

var user = require('./apiUser');
router.use('/users', user);

// The common access point for further API routing

function apiNotFound(req, res, next) {
    res.status(HttpStatus.NOT_FOUND);
    res.json(
        {
            statusCode : HttpStatus.NOT_FOUND,
            devError : "There is nothing at the api root address. Please refer " +
            "to the API documentation for further details.",
            error : "404 Not Found"
        }
    );
}

router.get('/', function (req, res, next) {
    apiNotFound(req, res, next);
});

router.post('/', function (req, res, next) {
    apiNotFound(req, res, next);
});

module.exports = router;