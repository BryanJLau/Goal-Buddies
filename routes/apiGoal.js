var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var config = require('../config');
var middle = require('./commonMiddleware');

var errorHandler = require('../lib/errorHandler');
var statics = require('../lib/static');

var UserModel = require('../models/userModel');
var GoalModel = require('../models/goalModel');

router.get('/list/:username?', middle.verifyToken, middle.cleanBody, function (req, res, next) {
    var username = req.params.username || req.user.username;
    UserModel.findOne({username: username}, 'relationships goals', function(err, user) {
        console.log(user);
        if(err) {
            errorHandler.logError(err, res);
        } else if(!user ||
                  user.relationships.blocking.indexOf(req.user.username) > -1) {
            // We shouldn't display information about nonexistent users
            // and people who have blocked you
            errorHandler.targetUserNotFound(res);
        } else {
            if(!req.params.username || username == req.user.username) {
                // Want your own goals, so get everything
                return res.json(user.goals);
            } else if(user.relationships.friends.indexOf(req.user.username) > -1) {
                // You're actually friends, proceed
                // Don't return all the goals, just pending and major
                // for motivations and eye candy respectively
                var goals = {};
                goals.pendingRecurring = user.goals.pendingRecurring;
                goals.pendingOneTime = user.goals.pendingOneTime;
                goals.major = user.goals.major;
                return res.json(goals);
            } else {
                errorHandler.targetUserNotFriend(res);
            }
        }
    });
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
    var daysToFinish = parseInt(req.body.daysToFinish);
    var d = new Date();
    
    var newGoal = new GoalModel();
    newGoal.description = req.body.description;
    newGoal.type = parseInt(req.body.type);
    newGoal.icon = req.body.icon;
    if(daysToFinish) {
        newGoal.dates.finished = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
            .getTime() + 86400000 * daysToFinish;
    }
    
    console.log(daysToFinish);
    console.log(req.body.daysToFinish);
    
    UserModel.findById(req.user._id, 'goals statistics', function(err, user) {
        if(err) {
            return errorHandler.logError(res);
        } else if (!user) {
            errorHandler.userNotFound(res);
        } else {
            switch(parseInt(req.body.type)) {
                case 0:
                    user.goals.pendingRecurring.unshift(newGoal);
                    break;
                case 1:
                    user.goals.pendingOneTime.unshift(newGoal);
                    break;
                default:
                    return errorHandler.missingParameters(res);
            }
        }
        
        user.statistics.totalGoals++;
        
        user.save(function(err) {
            if(err) {
                // Check for validation errors
                for (var property in err.errors) {
                    if(err.errors.hasOwnProperty(property)) {
                        if(err.errors[property].value == undefined) {
                            // .path has the missing field name
                            return errorHandler.missingParameters(res);
                        }
                    }
                }
                
                return errorHandler.logError(err, res);
            } else {
                res.status(HttpStatus.CREATED);
                return res.json(newGoal);
            }
        });
    });
});

/*
 * Edit a goal function
 * Parameters:
 *      token : Your personal access token
 *      description : Your new description of the goal
 * Returns:
 *      statusCode : Ok (200) if successful, Not Found (404) on failure
 *      goal : A JSONObject representing your new goal details
 */
router.post('/:id/edit', middle.verifyToken, function (req, res, next) {
    var description = req.body.description;
    var id = req.params.id;
    
    if (!description) {
        errorHandler.missingParameters(res);
    } else {
        UserModel.findById(req.user._id, 'goals', function(err, user) {
            if(err) {
                return errorHandler.logError(res);
            } else if (!user) {
                return errorHandler.userNotFound(res);
            } else {
                var goal;
                
                if(goal = user.goals.pendingRecurring.id(id)) {
                    goal.description = description;
                } else if(goal = user.goals.pendingOneTime.id(id)) {
                    goal.description = description;
                } else {
                    return errorHandler.goalNotFound(res);
                }
                
                user.save(function(err) {
                    if(err) {
                        return errorHandler.logError(err, res);
                    } else {
                        res.status(HttpStatus.OK);
                        return res.json(goal);
                    }
                });
            }
        });
    }
});

/*
 * Finish a goal function
 * Parameters:
 *      token : Your personal access token
 * Returns:
 *      statusCode : Ok (205) if successful, Unauthorized (401) 
 *                   Not Found (404), or Bad Request (400) on failure
 *      goal : A JSONObject representing your new goal details
 */
router.post('/:id/finish', middle.verifyToken, function (req, res, next) {
    var id = req.params.id;
    
    UserModel.findById(req.user._id, 'goals statistics', function(err, user) {
        if(err) {
            return errorHandler.logError(res);
        } else if (!user) {
            return errorHandler.userNotFound(res);
        } else {
            var goal;
            
            if(goal = user.goals.pendingRecurring.id(id)) {
                var d = new Date();
                // Can't finish more than once per day
                if(d - goal.dates.lastDate < 86400000) {
                    return errorHandler.goalFinishedToday(res);
                } else {
                    goal.dates.lastDate =
                        new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
                    goal.times++;
                }
            } else if(goal = user.goals.pendingOneTime.id(id)) {
                // Add to daysSaved (or subtract, hopefully not)
                user.statistics.daysSaved +=
                    (goal.dates.finished - goal.dates.created) / 86400000;
                    
                goal.dates.finished = new Date();
                user.goals.finishedOneTime.unshift(goal);
                
                user.goals.pendingOneTime.id(id).remove();
            } else {
                return errorHandler.goalNotFound(res);
            }
            
            user.statistics.goalsCompleted++;
            
            user.save(function(err) {
                if(err) {
                    return errorHandler.logError(err, res);
                } else {
                    res.status(HttpStatus.OK);
                    return res.json(goal);
                }
            });
        }
    });
});

/*
 * Motivate a goal function
 * Parameters:
 *      token : Your personal access token
 * Returns:
 *      statusCode : No Content (204) if successful, Unauthorized (401) on failure
 */
router.post('/:id/motivate', middle.verifyToken, function (req, res, next) {
    res.status(HttpStatus.NOT_IMPLEMENTED);
    return res.send("Functionality under development");
    
    //return res.send("Function not implemented yet.");
    /*
     * The general flow of the function is as follows:
     * 1. Find the goal
     * 2. Find and update the user that owns the goal
     * 3. Update the goal (increment and mark as unread)
     * 4. Rollback if necessary
     */
    
    GoalModel.findById(req.params.id, findingGoal);
    var goal = null;
    var user = null;
    var oldDate = null;
    var oldMotivators = [];
    var version = -1;
    
    // 1. Find the goal
    function findingGoal(err, foundGoal) {
        if (err) {
            errorHandler.logError(err, res);
        }
        else if (!foundGoal) {
            errorHandler.goalNotFound(res);
        }
        else {
            goal = foundGoal;
            UserModel.findById(foundGoal.userId, findingUser);
        }
    }
    
    // 2. Find and update the user that owns the goal
    function findingUser(err, foundUser) {
        if(err) {
            errorHandler.logError(err, res);
        } else if (!foundUser) {
            errorHandler.targetUserNotFound(res);
        } else if (foundUser.friends.indexOf(req.user._id) == -1) {
            errorHandler.targetUserNotFriend(res);
        } else {
            user = foundUser;
            
            // Check if already motivated today
            var today = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
            if (user.lastMotivated == today && user.motivators.indexOf(req.user.username) > -1) {
                errorHandler.alreadyMotivatedToday(res);
            } else {
                // Copy in case of rollback
                for(var i = 0; i < user.motivators; i++) {
                    oldMotivators.push(user.motivators[i]);
                }
                oldDate = user.lastMotivated;
                
                if(user.lastMotivated < today) {
                    // It's a new day! Clear everyone out
                    user.motivators.length = 0;
                }
                
                user.timesMotivated++;
                user.version++;
                user.lastMotivated = today;
                user.motivators.push(req.user.username);
                
                foundUser.save(savingUser);
            }
        }
    }
    
    // 3. Update the goal (increment and mark as unread)
    function savingUser(err) {
        if(err) {
            errorHandler.logError(err, res);
        } else {
            goal.version = version;
            goal.times++;
            goal.unread = true;
            goal.save(savingGoal);
        }
    }
    
    // 4. Rollback if necessary
    function savingGoal(err) {
        if(err) {
            errorHandler(err, res);
            
            user.timesMotivated--;
            user.lastMotivated = oldDate;
            user.motivators = oldMotivators;
            
            user.save();
        } else {
            // Save successful
            res.status(HttpStatus.NO_CONTENT);
            return res.send('');
        }
    }
});

/*
 * Delete a goal function
 * Parameters:
 *      token : Your personal access token
 * Returns:
 *      statusCode : No Content (204) if successful, Not Found (404) on failure
 */
router.post('/:id/delete', middle.verifyToken, function (req, res, next) {
    var id = req.params.id;
    
    UserModel.findById(req.user._id, 'goals statistics', function(err, user) {
        if(err) {
            return errorHandler.logError(res);
        } else if (!user) {
            return errorHandler.userNotFound(res);
        } else {
            var goal =
                user.goals.pendingRecurring.id(id) ||
                user.goals.pendingOneTime.id(id) ||
                user.goals.finishedRecurring.id(id) ||
                user.goals.finishedOneTime.id(id) ||
                user.goals.major.id(id);
            
            if(goal) {
                goal.remove();
            } else {
                return errorHandler.goalNotFound(res);
            }
            
            user.save(function(err) {
                if(err) {
                    return errorHandler.logError(err, res);
                } else {
                    res.status(HttpStatus.NO_CONTENT);
                    return res.send('');
                }
            })
        }
    });
});

module.exports = router;