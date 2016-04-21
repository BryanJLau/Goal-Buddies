var express = require('express');
var HttpStatus = require('http-status-codes');
var router = express.Router();

var user = require('./apiUser');
router.use('/users', user);

var goals = require('./apiGoal');
router.use('/goals', goals);

var middle = require('./commonMiddleware');
var UserModel = require('../models/userModel');
var GoalModel = require('../models/goalModel');
var errorHandler = require('../lib/errorHandler');

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

router.get('/search', middle.checkToken, function (req, res, next) {
    /*
     * The general flow of the function is as follows:
     * 1. Find own goals with the keyword
     * 2. Find a user with the corresponding username
     * 3. Return the information to the user
     */
    
    var q = req.query.q || "";
    
    var goalList = [];
    
    var goalMatchObject = {
        userId : req.user._id,
        $text : {
            $search : q
        }
    }
    var userMatchObject = {
        username : q
    }
    
    // 1. Find own goals with the keyword
    GoalModel.find(goalMatchObject, function (err, goals) {
        if (err) {
            // Invalid credentials
            errorHandler.userNotFound(res);
        }
        else {
            // Success! Build a JSON web token and give it to the client
            // Versioning for apps
            var maxVersion = 0;
            
            for (var i = 0; i < goals.length; i++) {
                goalList.push(goals[i]);
            }
            
            UserModel.findOne(userMatchObject, 'username blocked', findUser);
        }
    });
    
    // 2. Find a user with the corresponding username
    function findUser(err, user) {
        if (err) {
            // Invalid credentials
            errorHandler.userNotFound(res);
        }
        else {
            // Don't display if blocked
            if(user && user.blocked.indexOf(req.user.username) > -1) {
                user = null;
            }
        
            res.status(HttpStatus.OK);
            var responseJson = {
                goals : goalList,
                user : user
            }
            return res.json(responseJson);
        }
    }
});

router.get('/', function (req, res, next) {
    apiNotFound(req, res, next);
});

router.post('/', function (req, res, next) {
    apiNotFound(req, res, next);
});

module.exports = router;