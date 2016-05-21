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
    // Only do something if you're friends with the target
    if(req.params.username && req.params.username != req.user.username) {
        UserModel.findOne({username: req.params.username}, function(err, user) {
            if(err) {
                errorHandler.logError(err, res);
            } else if(!user || user.blocked.indexOf(req.user.username) > -1) {
                errorHandler.targetUserNotFound(res);
            } else {
                if(user.friends.indexOf(req.user.username) > -1) {
                    // You're actually friends, proceed
                    getGoalList(user._id);
                } else {
                    errorHandler.targetUserNotFriend(res);
                }
            }
        });
    } else {
        getGoalList(req.user._id);
    }
    
    function getGoalList(userId) {
        // Base condition
        var matchObject = {
            userId : userId
        };
        
        if(userId != req.user._id) {
            // Set restrictions for other users
            if (typeof req.query.type == 'undefined' || req.query.type == '' ) {
                errorHandler.missingParameters(res);
            } else {
                matchObject.type = parseInt(req.query.type);
                matchObject.pending = true;
                
                GoalModel
                    .find(matchObject)
                    .limit(20)
                    .sort({ eta : 1 })
                    .exec(foundGoals);
            }
        } else {
            if(req.query.all) {
                // Get everything!
                GoalModel
                    .find(matchObject)
                    .sort({ eta : 1 })
                    .exec(foundGoals);
            } else {
                // Add the restrictions in
                
                matchObject.version = {
                    $gt: parseInt(req.query.version) || 0
                };
                matchObject.type = parseInt(req.query.type) || 0;
                // Default to true, but false if not 'true' (case insensitive)
                matchObject.pending = 
                    req.query.pending ? req.query.pending.toLowerCase() === 'true' : true;
                    
                if(req.query.q) {
                    // We want to text search as well
                    matchObject.$text = {
                        $search : req.query.q
                    };
                }
                
                var goalQuery = GoalModel
                    .find(matchObject)
                    .sort({ eta : 1 });
                
                // Modify the query if there's a limit present
                if(req.query.limit) {
                    goalQuery = goalQuery.limit(parseInt(req.query.limit) || 10);
                }
                if(req.query.offset) {
                    goalQuery = goalQuery.skip(parseInt(req.query.offset) || 0)
                }
                
                goalQuery.exec(foundGoals);
            }
        }
    }
    
    function foundGoals(err, goals) {
        if (err) {
            // Invalid credentials
            errorHandler.logError(err, res);
        }
        else {
            // Success! Build a JSON web token and give it to the client
            var goalList = [];
            // Versioning for apps
            var maxVersion = 0;
            
            for (var i = 0; i < goals.length; i++) {
                if (req.query.all) maxVersion = Math.max(maxVersion, goals[i].version);
                goalList.push(goals[i]);
            }
            
            res.status(HttpStatus.OK);
            var responseJson = {
                goals : goalList,
                totalGoals : goals.length
            }
            // Only include version if requesting all goals for yourself
            if (req.query.all && !req.params.username)
                responseJson.maxVersion = maxVersion
            return res.json(responseJson);
        }
    }
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
    /*
     * The general flow of the function is as follows:
     * 1. Update totalGoals and version for user and save
     * 2. Create the goal and save it
     * 3. Return the goal to the user
     */

    var description = req.body.description;
    var type = req.body.type;
    var icon = req.body.icon || "star";
    var daysToFinish = parseInt(req.body.daysToFinish);

    if (typeof description == 'undefined' || typeof type == 'undefined' ||
        typeof daysToFinish == 'undefined' ||
        description == '' || type == '' ||
        daysToFinish == '') {
        errorHandler.missingParameters(res);
    }
    else {
        var version = 0;    // Needs to be outside scope of local functions
        var newGoal = new GoalModel();  // Needs to be outside to return
        
        // 1. Update totalGoals and version for user and save
        UserModel.findByIdAndUpdate(
            req.user._id,
            {
                $inc: {
                    version: 1,
                    totalGoals: 1
                }
            },
            {
                new : true      // Returns modified user (need updated version)
            },
            savingUser
        );
        
        // 2. Create the goal and save it
        function savingUser (err, user) {
            if (err) {
                errorHandler.logError(err, res);
            }
            else if (!user) {
                errorHandler.userNotFound(res);
            }
            else {
                // Save successful
                var d = new Date();
                
                // User found, craft a goal, push it onto the goal array, and save
                newGoal.userId = req.user._id;
                newGoal.description = description;
                newGoal.type = type;
                newGoal.icon = icon;
                newGoal.eta = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
                    .getTime() + 86400000 * parseInt(daysToFinish);
                newGoal.version = user.version;

                newGoal.save(savingGoal);
            }
        }
        
        // 3. Return the goal to the user
        function savingGoal (err) {
            if (err) {
                errorHandler.logError(err, res);
                rollBackUser();
            }
            else {
                console.log("Successfully created goal: " + newGoal._id +
                            " for user " + req.user._id + ".");
                res.status(HttpStatus.CREATED);
                return res.json(
                    {
                        goal : newGoal
                    }
                );
            }
        }
        
        // This function should happen in the background in the server
        function rollBackUser () {
            console.log("Rolling back user " + req.user._id + " after " +
                "failed goal creation."
            );
            UserModel.findByIdAndUpdate(
                req.user._id,
                {
                    $inc: {
                        totalGoals: -1
                    }
                },
                // This should happen in the background without user knowing
                function (err, user) {
                    if (err) console.log(err);
                }
            );
        }   // End rollBackUser
    }
});

/*
 * Edit a goal function
 * Parameters:
 *      token : Your personal access token
 *      description : Your new description of the goal
 * Returns:
 *      statusCode : Ok (205) if successful, Not Found (404) on failure
 *      goal : A JSONObject representing your new goal details
 */
router.post('/:id/edit', middle.verifyToken, function (req, res, next) {
    /*
     * The general flow of the function is as follows:
     * 1. Update version for user and save
     * 2. Find, update, and save the goal
     * 3. Return the goal to the user
     */
    
    var description = req.body.description;
    
    if (typeof description == 'undefined' || description == '') {
        errorHandler.missingParameters(res);
    }
    else {
        var version = 0;    // Needs to be outside scope of local functions
        
        // 1. Update version for user and save
        UserModel.findByIdAndUpdate(
            req.user._id,
            {
                $inc: {
                    version: 1
                }
            },
            {
                new : true      // Returns modified user (need updated version)
            },
            savingUser
        );
        
        // 2. Find, update, and save the goal
        function savingUser(err, user) {
            if (err) {
                errorHandler.logError(err, res);
            }
            else if (!user) {
                errorHandle.userNotFound(res);
            }
            else {
                version = user.version;

                GoalModel.findByIdAndUpdate(
                    req.params.id,
                    {
                        // To prevent overwriting it with incomplete details
                        $set: {
                            description: description,
                            version: version
                        }
                    },
                    {
                        new : true      // Returns modified goal
                    },
                    updatingGoal
                );
            }
        }

        // 3. Return the goal to the user
        function updatingGoal(err, goal) {
            if (err) {
                errorHandler.logError(err, res);
            }
            else if (!goal) {
                errorHandler.goalNotFound(res);
            }
            else {
                console.log(
                    "Successfully edited description for goal " +
                    req.params.id
                );
                res.status(HttpStatus.OK);
                return res.json(
                    {
                        goal : goal
                    }
                );
            }
        }   // End updatingGoal
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
    /*
     * The general flow of the function is as follows:
     * 1. Update goalsCompleted and version for user and save
     * 2. Find the goal
     * 3. Update and save the goal
     * 4. Return the goal to the user
     */
    
    var version = 0;    // Needs to be outside scope of local functions
    var oldGoal = null;  // Needs to be outside to return

    // 1. Update goalsCompleted and version for user and save
    UserModel.findByIdAndUpdate(
        req.user._id,
        {
            $inc: {
                version: 1,
                goalsCompleted: 1
            }
        },
        {
            new : true      // Returns modified user (need updated version)
        },
        savingUser
    );
    
    // 2. Find the goal
    function savingUser(err, user) {
        if (err) {
            errorHandler.logError(err, res);
        }
        else if (!user) {
            errorHandler.userNotFound(res);
        }
        else {
            version = user.version;

            // Save successful
            GoalModel.findById(req.params.id, findingGoal);
        }
    }
    
    // 3. Update and save the goal
    function findingGoal(err, goal) {
        if (err) {
            errorHandler.logError(err, res);
        }
        else if (!goal) {
            errorHandler.goalNotFound(res);
        }
        else {
            // Calculate today for last finish comparison
            var d = new Date();
            var today = new Date(d.getFullYear(), d.getMonth(),
                    d.getDate(), 0, 0, 0, 0).getTime() + 86400000;

            if (!goal.pending || goal.finished >= today) {
                errorHandler.completedGoal(res);
            }
            else {
                goal.finished = today;
                if (goal.type == statics.goalTypes.recurring()) {
                    goal.times++;
                }
                else if (goal.type == statics.goalTypes.oneTime()) {
                    goal.pending = false;
                }

                oldGoal = goal;
                goal.save(savingGoal);
            }
        }
    }

    // 4. Return the goal to the user
    function savingGoal(err) {
        if (err) {
            errorHandler.logError(err, res);
            rollBackUser();
        }
        else {
            console.log("Successfully finished goal: " + oldGoal._id +
                            " for user " + req.user._id + ".");
            res.status(HttpStatus.OK);
            return res.json(
                {
                    goal : oldGoal
                }
            );
        }
    }
    
    // This function should happen in the background in the server
    function rollBackUser() {
        console.log("Rolling back user " + req.user._id + " after " +
                "failed goal finishing."
        );
        UserModel.findByIdAndUpdate(
            req.user._id,
                {
                $inc: {
                    goalsCompleted: -1
                }
            },
                // This should happen in the background without user knowing
                function (err, user) {
                if (err) console.log(err);
            }
        );
    }   // End rollBackUser
});

/*
 * Motivate a goal function
 * Parameters:
 *      token : Your personal access token
 * Returns:
 *      statusCode : No Content (204) if successful, Unauthorized (401) on failure
 */
router.post('/:id/motivate', middle.verifyToken, function (req, res, next) {
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
    /*
     * The general flow of the function is as follows:
     * 1. Find the goal
     * 2. Check the goal and remove it
     * 3. Update totalGoals for the user and save
     */
    
    // 1. Find the goal
    GoalModel.findById(req.params.id, findingGoal);
    
    // 2. Check the goal and remove it
    function findingGoal(err, goal) {
        if (err) {
            errorHandler.logError(err);
        } else if (!goal || goal.userId != req.user._id) {
            // Either the goal wasn't found, or it wasn't the user's
            errorHandler.goalNotFound(res);
        }
        else {
            if (!goal.pending) {
                errorHandler.completedGoal(res);
            }
            else {
                GoalModel.findByIdAndRemove(req.params.id, deletingGoal);
            }
        }
    }
    
    // 3. Update totalGoals for the user and save
    function deletingGoal(err) {
        if (err) {
            errorHandler.logError(err, res);
        }
        else {
            UserModel.findByIdAndUpdate(
                req.user._id,
                {
                    $inc: {
                        totalGoals: -1
                    }
                },
                {
                    new : true      // Returns modified user (need updated version)
                },
                savingUser
            );
        }
    }
    
    // Return appropriate response
    function savingUser(err, user) {
        if (err) {
            errorHandler.logError(err, res);
        }
        else if (!user) {
            // Should not happen
            errorHandler.userNotFound(res);
        }
        else {
            // Save successful
            res.status(HttpStatus.NO_CONTENT);
            return res.send('');
        }
    }
});

module.exports = router;