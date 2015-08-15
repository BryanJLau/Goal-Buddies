var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var bcrypt = require('bcrypt-nodejs');
var config = require('../config');
var jwt = require('jsonwebtoken');
var middle = require('./commonMiddleware');

var UserModel = require('../models/userModel');
var GoalModel = require('../models/goalModel');

router.get('/list/', middle.verifyToken, function (req, res, next) {
    var user = req.user;
    var version = req.params.version || 0;
    var offset = req.params.offset || 0;
    var limit = req.params.limit || 10;
    var type = req.params.type || 0;
    var finished = req.params.finished || false;
    
    console.log("Fetching goals for user id: " + user._id);

    UserModel.findOne({ '_id': user._id }, function (err, user) {
        if (err || !user) {
            // Invalid credentials
            res.status(HttpStatus.NOT_FOUND);
            res.json(
                {
                    statusCode : HttpStatus.UNAUTHORIZED,
                    devError : "The token's user is not found. Perhaps " +
                    "the token was corrupted?",
                    error : "Your access token is not valid. Please login again.",
                }
            );
        }
        else {
            // Success! Build a JSON web token and give it to the client
            var goalList = [];
            
            // Sort goals in soonest to latest ETA
            user.goals.sort(function (a, b) {
                return a.eta - b.eta;
            });

            for (var i = offset; i <= user.goals.length && goalList.length <= limit; i++) {
                if (i == user.goals.length || goalList.length == limit) {
                    res.status(HttpStatus.OK);
                    return res.json(
                        {
                            goals : goalList,
                            totalGoals : user.goals.length
                        }
                    );
                }
                else if (user.goals[i].version > version)
                    goalList.push(user.goals[i]);
            }
        }
    });
});

/*
 * Get a user's list of goals
 * Parameters:
 *      token : Your personal access token
 *      username : (OPTIONAL) The requested user's username
 *      version : Get all goals with version > this parameter
 * Returns:
 *      statusCode : Created (201) if successful, Unauthorized (401) or
 *                   Bad Request (400) on failure
 *      goalList : A JSONArray with goals
 */
router.get('/list/:username', middle.verifyToken, function (req, res, next) {
    var user = req.user;
    var username = req.params.username;
    
    console.log(username);
    return res.send(username);
    /*
    UserModel.findOne({ '_id': req.user._id }, function (err, user) {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            // Invalid credentials
            res.status(HttpStatus.UNAUTHORIZED);
            res.json(
                {
                    statusCode : HttpStatus.UNAUTHORIZED,
                    devError : "An invalid username/password combination " +
                        "was provided. Please prompt the user again.",
                    error : "Invalid username/password combination.",
                }
            );
        }
        else {
            // Success! Build a JSON web token and give it to the client
            var trimmedUser = {
                _id : user._id,
                username : username
            };
            res.status(HttpStatus.OK);
            res.json(
                {
                    token : jwt.sign(
                        trimmedUser,
                            config.tokenSecret,
                            { expiresInMinutes: 1440 }  // expires in 24 hours
                    ),
                    // This is used in any apps that need to save the credentials
                    // such as the Android app
                    user : trimmedUser
                }
            );
        }
    });
    
    
    


    var userId = TokenHashTable.getId(token);
    if (userId == -1) {
        // Token does not exist
        res.status(HttpStatus.UNAUTHORIZED);
        res.send(
            {
                error : "Your access token has expired. Please login again.",
                goalList : null
            }
        );
        return;
    }
    else {
        if (username == "" || typeof username == 'undefined') {
            // Want own goals
            var data = dummyGoalData;
            var goalArray = [];
            for (var i = 0; i <= data.goals.length; i++) {
                if (i == data.goals.length) {
                    res.status(HttpStatus.OK);
                    res.send(
                        {
                            error : null,
                            goalList : goalArray
                        }
                    );
                }
                else {
                    if (data.goals[i].userId == userId) goalArray.push(data.goals[i]);
                }
            }
            
            return;
        }
        else {
            // Want someone else's goals
            res.status(HttpStatus.NOT_FOUND);
            res.send(
                {
                    error : "This feature is not implemented yet.",
                    goalList : null
                }
            );
            return;
        }
    }*/
});

/*
 * Create a goal function
 * Parameters:
 *      token : Your personal access token
 *      description : Your description of the goal
 *      type : The type of goal (recurring: 0, one-time: 1)
 *      icon : An integer representing a predefined icon
 *      daysToFinish : Projected number of days to completion
 * Returns:
 *      statusCode : Created (201) if successful, Not Found (404) on failure
 *      goal : A JSONObject representing your new goal details
 */
router.post('/', middle.verifyToken, function (req, res, next) {
    var description = req.body.description;
    var type = req.body.type;
    var icon = req.body.icon || 0;
    var daysToFinish = req.body.daysToFinish;
    
    if (typeof description == 'undefined' || typeof type == 'undefined' ||
        typeof daysToFinish == 'undefined' ||
        description == '' || type == '' ||
        daysToFinish == '') {
        
        res.status(HttpStatus.BAD_REQUEST);
        return res.json(
            {
                statusCode : HttpStatus.BAD_REQUEST,
                devError : "Not all required fields were sent to the server. " +
                "Make sure the user has inputted all fields, and that you have " +
                "sent all the fields as well.",
                error : "Please fill in all required fields.",
                description : description,
                type : type,
                daysToFinish : daysToFinish
            }
        );
        return;
    }
    else {
        UserModel.findOne({ '_id': req.user._id }, function (err, user) {
            if (err || !user) {
                // Invalid credentials
                console.log(err);
                res.status(HttpStatus.NOT_FOUND);
                return res.json(
                    {
                        statusCode : HttpStatus.UNAUTHORIZED,
                        devError : "The user id contained in the token does " +
                        "not exist. Try prompting the user to log in again to " +
                        "get a new token for the user.",
                        error : "The token's owner is not found. Please login again.",
                    }
                );
            }
            else {
                var d = new Date();
                
                // User found, craft a goal, push it onto the goal array, and save
                var newGoal = new GoalModel();
                var description = req.body.description;
                var type = req.body.type;
                var icon = req.body.icon || 0;
                var daysToFinish = req.body.daysToFinish;
                newGoal.description = description;
                newGoal.type = type;
                newGoal.icon = icon;
                newGoal.eta = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
                    .getTime() + 86400000 * parseInt(daysToFinish);
                user.goals.push(newGoal);
                
                user.save(function (err) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                        return res.json(
                            {
                                statusCode : HttpStatus.INTERNAL_SERVER_ERROR,
                                devError : "Something went wrong with the server. " +
                                "Please contact the developer about this.",
                                error : "Sorry, something went wrong! Please try again later.",
                            }
                        );
                    }
                    else {
                        console.log("Successfully created goal: " + newGoal._id +
                            " for user " + user._id + ".");
                        res.status(HttpStatus.CREATED);
                        return res.json(newGoal);
                    }
                });
            }
        });
    }
});

module.exports = router;