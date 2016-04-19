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

/* Get search page. */
router.post('/search', middle.checkToken, function (req, res, next) {
	// Copy the search API for now
	/*
     * The general flow of the function is as follows:
     * 1. Find own goals with the keyword
     * 2. Find a user with the corresponding username
     * 3. Return the information to the user
     */
	
	var goalList = [];
	
	var q = req.body.q || "";
	
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
			console.log(err)
        }
        else {
            // Success! Build a JSON web token and give it to the client
            // Versioning for apps
            var maxVersion = 0;
            console.log(goals)
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
				console.log("blocked")
			}
			
			res.status(HttpStatus.OK);
			var responseJson = {
				q: q,
				goals : goalList,
				user : user
			}
			console.log(responseJson);
			return res.render('search', responseJson);
		}
	}
});

module.exports = router;
