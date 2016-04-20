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

router.get('/list/', middle.verifyToken, middle.cleanBody, function (req, res, next) {
    var version = parseInt(req.query.version) || 0;
    var offset = parseInt(req.query.offset) || 0;
    var limit = parseInt(req.query.limit) || 10;
    var type = parseInt(req.query.type) || 0;
    // String to convert to bool
    // Default to true, but false if not 'true' (case insensitive)
    var pending = req.query.pending ? req.query.pending.toLowerCase() === 'true' : true;
    // Default to true, but false if not 'true' (case insensitive)
    req.query.all = req.query.all || '';
    var all = req.query.all.toLowerCase() === 'true';
    var q = req.query.q;
    
    // If all, then override all other options
    if (all) {
        version = 0;
        offset = 0;
        type = null;    // So we don't find based on type
        pending = null;
        q = '';
    }

    console.log("Fetching goals for user id: " + req.user._id);
    
    // Match a query if applicable
    var matchObject = {
        userId : req.user._id,
        version : { $gt : version }
    };
    if (!(typeof q == 'undefined' || q == '')) {
        matchObject.$text = {
            $search : q
        };
    }
    if (type != null) {
        matchObject.type = type;
    }
    if (pending != null) {
        matchObject.pending = pending;
    }

    // Sort by ETA always
    var optionsObject = { sort: { eta: 1} };
    
    // If the limit is -1 or all, then user wants no limit
    if (limit === -1 || all) limit = Number.MAX_VALUE;

    GoalModel.find(matchObject, null, optionsObject, function (err, goals) {
        if (err) {
            // Invalid credentials
            errorHandler.userNotFound(res);
        }
        else {
            // Success! Build a JSON web token and give it to the client
            var goalList = [];
            // Versioning for apps
            var maxVersion = 0;
            
            for (var i = offset; i <= goals.length && goalList.length <= limit; i++) {
                if (i == goals.length || goalList.length == limit) {
                    res.status(HttpStatus.OK);
                    var responseJson = {
                        goals : goalList,
                        totalGoals : goals.length
                    }
                    // Only include version if requesting all goals
                    if (all) responseJson.maxVersion = maxVersion
                    return res.json(responseJson);
                }
                else {
                    if (all) maxVersion = Math.max(maxVersion, goals[i].version);
                    goalList.push(goals[i]);
                }
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
        if (!goal || goal.userId != req.user._id) {
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
router.post('/:id/edit', middle.verifyToken, function (req, res, next) {
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