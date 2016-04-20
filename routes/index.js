var express = require('express');
var router = express.Router();
var middle = require('./commonMiddleware');

var UserModel = require('../models/userModel');
var GoalModel = require('../models/goalModel');
var errorHandler = require('../lib/errorHandler');
var HttpStatus = require('http-status-codes');

/* GET home page. */
router.get('/', middle.checkToken, function (req, res, next) {
    // Pull this out to ensure rendering happens after
    //var renderIndex = function (statsObject) {
        res.render('index', {
            title : 'Goal Buddies',
            //totalGoals : statsObject.totalGoals,
            //goalsCompleted : statsObject.goalsCompleted,
            //daysSaved : statsObject.daysSaved,
            //timesMotivated : statsObject.timesMotivated,
            user: req.user
        });
    //}
    
    //db.getGlobalStatistics(renderIndex);
});

/* GET about page. */
router.get('/about', middle.checkToken, function (req, res, next) {
    res.render('about', { user: req.user });
});

module.exports = router;
