var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var config = require('../config');
var middle = require('./commonMiddleware');

var UserModel = require('../models/userModel');
var GoalModel = require('../models/goalModel');

router.get('/list/', middle.verifyToken, function (req, res, next) {
    var user = req.user;
    var version = parseInt(req.query.version) || 0;
    var offset = parseInt(req.query.offset) || 0;
    var limit = parseInt(req.query.limit) || 10;
    var type = parseInt(req.query.type) || 0;
    // String to convert to bool
    // Default to true, but false if not 'true' (case insensitive)
    var pending = req.query.pending ? req.query.pending.toLowerCase() === 'true' : true;

    console.log("Fetching goals for user id: " + user._id);
    
    console.log(user._id);
    
    // Need to use aggregate function: get the user, unroll the goals,
    // then match them according to the parameters, strip off the user id
    UserModel.aggregate([
        {
            $match : {
                username : user.username    // _id doesn't work?
            }
        },
        { "$unwind": "$goals" },
        {
            $match : {
                'goals.type' : type,
                'goals.pending' : pending,
                'goals.version' : { $gt : version }
            }
        },
        {
            $project : {
                goals : 1,
                _id : 0
            }
        }
    ], function (err, result) {
        if (err) {
            // Invalid credentials
            res.status(HttpStatus.NOT_FOUND);
            return res.json(
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
            result.sort(function (a, b) {
                return a.eta - b.eta;
            });
            
            for (var i = offset; i <= result.length && goalList.length <= limit; i++) {
                if (i == result.length || goalList.length == limit) {
                    res.status(HttpStatus.OK);
                    return res.json(
                        {
                            goals : goalList,
                            totalGoals : result.length
                        }
                    );
                }
                else goalList.push(result[i].goals);
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
    var daysToFinish = parseInt(req.body.daysToFinish);

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
                error : "Please fill in all required fields."+description+type+daysToFinish
            }
        );
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
                newGoal.description = description;
                newGoal.type = type;
                newGoal.icon = icon;
                newGoal.eta = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
                    .getTime() + 86400000 * parseInt(daysToFinish);
                user.goals.push(newGoal);
                
                user.totalGoals++;

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
                        return res.json(
                            {
                                goal : newGoal
                            }
                        );
                    }
                });
            }
        });
    }
});

/*
 * Edit a goal function
 * Parameters:
 *      token : Your personal access token
 *      id : In the parameter, unique identifier for the goal
 *      description : Your new description of the goal
 * Returns:
 *      statusCode : Ok (205) if successful, Not Found (404) on failure
 *      goal : A JSONObject representing your new goal details
 */
router.post('/:id/edit', middle.cleanBody, middle.verifyToken, function (req, res, next) {
    var description = req.body.description;
    
    if (typeof description == 'undefined' || description == '') {
        
        res.status(HttpStatus.BAD_REQUEST);
        return res.json(
            {
                statusCode : HttpStatus.BAD_REQUEST,
                devError : "Not all required fields were sent to the server. " +
                "Make sure the user has inputted all fields, and that you have " +
                "sent all the fields as well.",
                error : "Please fill in all required fields."
            }
        );
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
                // Find the goal with the id (if it exists)
                var goal = user.goals.id(req.params.id);
                
                if (!goal) {
                    res.status(HttpStatus.NOT_FOUND);
                    return res.json(
                        {
                            statusCode : HttpStatus.NOT_FOUND,
                            devError : "The goal with id " + req.params.id +
                            "was not found. Make sure you do not alter the goal " +
                            "id before sending a request using it.",
                            error : "The goal wasn't found. Please try again later."
                        }
                    );
                }
                else {
                    if (!goal.pending) {
                        res.status(HttpStatus.BAD_REQUEST);
                        return res.json(
                            {
                                statusCode : HttpStatus.BAD_REQUEST,
                                devError : "The goal being editted has already been " +
                                "completed. Please update the goal list before attempting " +
                                "to perform more actions.",
                                error : "You cannot edit an already completed goal."
                            }
                        );
                    }
                    user.version++;     // Update the user version for easy sync
                    
                    // Found the goal, update it and save it
                    goal.unread = false;    // Just in case it was motivated
                    goal.description = description;
                    goal.version = user.version;
                    
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
                            res.status(HttpStatus.OK);
                            return res.json(
                                {
                                    goal : goal
                                }
                            );
                        }
                    });     // End user.save
                }
            }
        });     // End UserModel.findOne
    }
});

/*
 * Finish a goal function
 * Parameters:
 *      token : Your personal access token
 *      id : In the parameter, unique identifier for the goal
 * Returns:
 *      statusCode : Ok (205) if successful, Unauthorized (401) 
 *                   Not Found (404), or Bad Request (400) on failure
 *      goal : A JSONObject representing your new goal details
 */
router.post('/:id/finish', middle.verifyToken, function (req, res, next) {
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
            // Find the goal with the id (if it exists)
            var goal = user.goals.id(req.params.id);
            
            if (!goal) {
                res.status(HttpStatus.NOT_FOUND);
                return res.json(
                    {
                        statusCode : HttpStatus.NOT_FOUND,
                        devError : "The goal with id " + req.params.id +
                        "was not found. Make sure you do not alter the goal " +
                        "id before sending a request using it.",
                        error : "The goal wasn't found. Please try again later."
                    }
                );
            }
            else {
                var d = new Date();
                var today = new Date(d.getFullYear(), d.getMonth(),
                    d.getDate(), 0, 0, 0, 0).getTime() + 86400000;
                
                if (!goal.pending) {
                    res.status(HttpStatus.BAD_REQUEST);
                    return res.json(
                        {
                            statusCode : HttpStatus.BAD_REQUEST,
                            devError : "The goal being finished has already been " +
                            "completed. Please update the goal list before attempting " +
                            "to perform more actions.",
                            error : "You cannot finish an already completed goal."
                        }
                    );
                }
                if (goal.finished >= today) {
                    res.status(HttpStatus.BAD_REQUEST);
                    return res.json(
                        {
                            statusCode : HttpStatus.BAD_REQUEST,
                            devError : "Today's date is out of range of the eta or " +
                            "last finished dates. Please update the goal list before " +
                            "attempting to perform more actions.",
                            error : "You cannot finish this goal today. Please update " +
                            "your current list of goals."
                        }
                    );
                }

                user.version++;     // Update the user version for easy sync
                user.goalsCompleted++;

                // Found the goal, update it and save it
                goal.unread = false;    // Just in case it was motivated
                // Update the last finished date no matter what type
                goal.finished = today;
                if(goal.type == 0)  // If recurring, then increment times finished
                    goal.times++;
                else {
                    goal.pending = false;   // One-time goals are finished
                }
                goal.version = user.version;
                
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
                        res.status(HttpStatus.OK);
                        return res.json(
                            {
                                goal : goal
                            }
                        );
                    }
                });
            }
        }
    });
});

/*
 * Motivate a goal function
 * Parameters:
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful, Unauthorized (401)
 *                   or Not Found (404) on failure
 */
router.post('/:username/:id/motivate', middle.verifyToken, function (req, res, next) {
    return res.send("Function not implemented yet.");
});

/*
 * Delete a goal function
 * Parameters:
 *      token : Your personal access token
 * Returns:
 *      statusCode : No Content (204) if successful, Not Found (404) on failure
 */
router.post('/:id/delete', middle.verifyToken, function (req, res, next) {
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
            // Find the goal with the id (if it exists)
            var goal = user.goals.id(req.params.id);
            
            if (!goal) {
                res.status(HttpStatus.NOT_FOUND);
                return res.json(
                    {
                        statusCode : HttpStatus.NOT_FOUND,
                        devError : "The goal with id " + req.params.id +
                        "was not found. Make sure you do not alter the goal " +
                        "id before sending a request using it.",
                        error : "The goal wasn't found. Please try again later."
                    }
                );
            }
            else {
                if (!goal.pending) {
                    res.status(HttpStatus.BAD_REQUEST);
                    return res.json(
                        {
                            statusCode : HttpStatus.BAD_REQUEST,
                            devError : "The goal being deleted has already been " +
                            "completed. Please update the goal list before attempting " +
                            "to perform more actions.",
                            error : "You cannot delete an already completed goal."
                        }
                    );
                }
                
                user.totalGoals--;
                user.version++;     // Update the user version for easy sync
                goal.remove();

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
                        res.status(HttpStatus.NO_CONTENT);
                        return res.send();
                    }
                });
            }
        }
    });
});

module.exports = router;