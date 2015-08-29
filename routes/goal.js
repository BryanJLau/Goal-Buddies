var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var middle = require('./commonMiddleware');

/* GET goal listing. */
router.get('/', function(req, res, next) {
    return res.render('goal/list');
});

module.exports = router;
