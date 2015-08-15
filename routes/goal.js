var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var middle = require('./commonMiddleware');

var TokenHashTable = require('../TokenHashTable.js');

var dummyGoalData = {
    "goals" : [
        {
            id : 0,
            userId : 0,
            description : "goal0",
            type : 0,
            icon : 0,
            eta : 99999999,
            timesFinished : 0,
            timesMotivated : 1
        },
        {
            id : 1,
            userId : 0,
            description : "goal1",
            type : 0,
            icon : 0,
            eta : 99999999,
            timesFinished : 2,
            timesMotivated : 3
        },
        {
            id : 2,
            userId : 0,
            description : "goal2",
            type : 0,
            icon : 0,
            eta : 99999999,
            timesFinished : 4,
            timesMotivated : 5
        },
    ]
}

//  API FUNCTIONS

/*
 * Get a user's list of goals
 * Parameters:
 *      token : Your personal access token
 *      username : (OPTIONAL) The requested user's username
 * Returns:
 *      statusCode : Created (201) if successful, Unauthorized (401) or
 *                   Bad Request (400) on failure
 *      goalList : A JSONArray with goals
 */
router.post('/list/', function (req, res, next) {
    var token = req.body.token || req.session.token;
    var username = req.body.username;
    var version = req.body.version;
    
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
 *      statusCode : Created (201) if successful, Unauthorized (401) or
 *                   Bad Request (400) on failure
 *      error : An error message in case of incorrect parameters
 *              or server errors
 *      goal : A JSONObject representing your new goal details
 */
router.post('/', function (req, res, next) {
    var token = req.body.token || req.session.token;
    var description = req.body.description;
    var type = req.body.type;
    var icon = req.body.icon;
    var daysToFinish = req.body.daysToFinish;
    
    if (typeof token == 'undefined' || typeof description == 'undefined' || 
        typeof type == 'undefined' || typeof icon == 'undefined' || 
        typeof daysToFinish == 'undefined' ||
        token == '' || description == '' || 
        type == '' || icon == '' || 
        daysToFinish == '') {
        res.status(HttpStatus.BAD_REQUEST);
        res.send(
            {
                error : "Please fill in all required fields.",
                goal : null
            }
        );
        return;
    }
    else {
        var userId = TokenHashTable.getId(token);
        if (userId == -1) {
            // Token does not exist
            res.status(HttpStatus.UNAUTHORIZED);
            res.send(
                {
                    error : "Your access token has expired. Please login again.",
                    goal : null
                }
            );
            return;
        }
        else {
            var data = dummyGoalData;

            var date = new Date();
            var msNow = date.getTime();
            
            console.log("Created goal " + data.goals.length + ": " + description);

            var newGoal = {
                id : data.goals.length,
                userId : userId,
                description : description,
                type : type,
                icon : icon,
                eta : msNow + 86400000 * daysToFinish,  // + 1 day
                timesFinished : 0,
                timesMotivated : 0
            };

            data.goals.push(newGoal);

            res.status(HttpStatus.CREATED);
            res.send(
                {
                    error : null,
                    goal : newGoal
                }
            );
        }
    }
});

/*
 * Get a goal function
 * Parameters:
 *      token : Your personal access token
 *      id : In the parameter, unique identifier for the goal
 * Returns:
 *      statusCode : OK (200) if successful, Unauthorized (401),
 *                   Not Found (404), or Bad Request (400) on failure
 *      error : An error message in case of incorrect parameters
 *              or server errors
 *      goal : A JSONObject representing your goal details
 */
router.get('/view/:id', function (req, res, next) {
    var token = req.body.token || req.session.token;
    var id = req.params.id;
    
    var invalidGoal = {
        id : -1,
        userId : -1,
        description : "",
        type : -1,
        icon : -1,
        eta : -1,
        timesFinished : -1,
        timesMotivated : -1
    }

    if (typeof token == 'undefined' || token == '') {
        res.status(HttpStatus.UNAUTHORIZED);
        res.send(invalidGoal);
        return;
    }
    else {
        var userId = TokenHashTable.getId(token);
        if (userId == -1) {
            // Token does not exist
            res.status(HttpStatus.UNAUTHORIZED);
            res.send(invalidGoal);
            return;
        }
        else {
            var data = dummyGoalData;
            
            for (var i = 0; i <= data.goals.length; i++) {
                if (i == data.goals.length) {
                    // Goal is not found!
                    res.status(HttpStatus.NOT_FOUND);
                    res.send(invalidGoal);
                    return;
                }
                else if (data.goals[i].id == id && data.goals[i].userId == userId) {
                    console.log("Retrieving goal " + id + ": ");
                    
                    res.status(HttpStatus.OK);
                    res.send(data.goals[i]);
                    return;
                }
            }
        }
    }
});

/*
 * Edit a goal's description
 * Parameters:
 *      token : Your personal access token
 *      id : In the parameter, unique identifier for the goal
 *      description : Your description of the goal
 * Returns:
 *      statusCode : Created (201) if successful, Unauthorized (401),
 *                   Not Found (404), or Bad Request (400) on failure
 *      error : An error message in case of incorrect parameters
 *              or server errors
 *      goal : A JSONObject representing your new goal details
 */
router.post('/:id/edit', function (req, res, next) {
    var token = req.body.token || req.session.token;
    var id = req.params.id;
    var description = req.body.description;
    
    if (typeof token == 'undefined' || typeof description == 'undefined' || 
        token == '' || description == '') {
        res.status(HttpStatus.BAD_REQUEST);
        res.send(
            {
                error : "Please fill in all required fields.",
                goal : null
            }
        );
        return;
    }
    else {
        var userId = TokenHashTable.getId(token);
        if (userId == -1) {
            // Token does not exist
            res.status(HttpStatus.UNAUTHORIZED);
            res.send(
                {
                    error : "Your access token has expired. Please login again.",
                    goal : null
                }
            );
            return;
        }
        else {
            var data = dummyGoalData;
            
            for (var i = 0; i <= data.goals.length; i++) {
                if (i == data.goals.length) {
                    // Goal is not found!
                    res.status(HttpStatus.NOT_FOUND);
                    res.send(
                        {
                            error : "This goal doesn't exist. Please refresh your page.",
                            goal : null
                        }
                    );
                    return;
                }
                else if (data.goals[i].id == id && data.goals[i].userId == userId) {
                    data.goals[i].description = description;
                    
                    console.log("Updated descripion for goal " + id + ": " +
                        description
                    );
                    
                    res.status(HttpStatus.OK);
                    res.send(
                        {
                            error : null,
                            goal : data.goals[i]
                        }
                    );
                    return;
                }
            }
        }
    }
});

/*
 * Finish a goal function
 * Parameters:
 *      token : Your personal access token
 *      id : In the parameter, unique identifier for the goal
 * Returns:
 *      statusCode : Created (201) if successful, Unauthorized (401),
 *                   Not Found (404), or Bad Request (400) on failure
 *      error : An error message in case of incorrect parameters
 *              or server errors
 *      goal : A JSONObject representing your new goal details
 */
router.post('/:id/finish', function (req, res, next) {
    var token = req.body.token || req.session.token;
    var id = req.params.id;
    
    if (typeof token == 'undefined' || token == '') {
        res.status(HttpStatus.UNAUTHORIZED);
        res.send(
            {
                error : "Please log in before modifying goals.",
                goal : null
            }
        );
        return;
    }
    else {
        var userId = TokenHashTable.getId(token);
        if (userId == -1) {
            // Token does not exist
            res.status(HttpStatus.UNAUTHORIZED);
            res.send(
                {
                    error : "Your access token has expired. Please login again.",
                    goal : null
                }
            );
            return;
        }
        else {
            var data = dummyGoalData;
            
            for (var i = 0; i <= data.goals.length; i++) {
                if (i == data.goals.length) {
                    // Goal is not found!
                    res.status(HttpStatus.NOT_FOUND);
                    res.send(
                        {
                            error : "This goal doesn't exist. Please refresh your page.",
                            goal : null
                        }
                    );
                    return;
                }
                else if (data.goals[i].id == id && data.goals[i].userId == userId) {
                    data.goals[i].timesFinished++;
                    
                    console.log("Finishing goal " + id);
                    
                    res.status(HttpStatus.OK);
                    res.send(
                        {
                            error : null,
                            goal : data.goals[i]
                        }
                    );
                    return;
                }
            }
        }
    }
});

/*
 * Motivate a goal function
 * Parameters:
 *      token : Your personal access token
 *      id : In the parameter, unique identifier for the goal
 * Returns:
 *      statusCode : Created (201) if successful, Unauthorized (401),
 *                   Not Found (404), or Bad Request (400) on failure
 *      error : An error message in case of incorrect parameters
 *              or server errors
 *      goal : A JSONObject representing your new goal details
 */
router.post('/:id/motivate', function (req, res, next) {
    var token = req.body.token || req.session.token;
    var id = req.params.id;
    
    // Need to implement relationship searching as well
    
    if (typeof token == 'undefined' || token == '') {
        res.status(HttpStatus.UNAUTHORIZED);
        res.send(
            {
                error : "Please log in before modifying goals.",
                goal : null
            }
        );
        return;
    }
    else {
        var userId = TokenHashTable.getId(token);
        if (userId == -1) {
            // Token does not exist
            res.status(HttpStatus.UNAUTHORIZED);
            res.send(
                {
                    error : "Your access token has expired. Please login again.",
                    goal : null
                }
            );
            return;
        }
        else {
            var data = dummyGoalData;
            
            for (var i = 0; i <= data.goals.length; i++) {
                if (i == data.goals.length) {
                    // Goal is not found!
                    res.status(HttpStatus.NOT_FOUND);
                    res.send(
                        {
                            error : "This goal doesn't exist. Please refresh your page.",
                            goal : null
                        }
                    );
                    return;
                }
                else if (data.goals[i].id == id && data.goals[i].userId == userId) {
                    data.goals[i].timesMotivated++;
                    
                    console.log("Motivating goal " + id);
                    
                    res.status(HttpStatus.OK);
                    res.send(
                        {
                            error : null,
                            goal : data.goals[i]
                        }
                    );
                    return;
                }
            }
        }
    }
});



/*
 * Delete a goal function
 * Parameters:
 *      token : Your personal access token
 *      id : In the parameter, unique identifier for the goal
 * Returns:
 *      statusCode : Created (201) if successful, Unauthorized (401),
 *                   Not Found (404), or Bad Request (400) on failure
 *      error : An error message in case of incorrect parameters
 *              or server errors
 *      goal : A JSONObject representing your new goal details
 */
router.delete('/:id', function (req, res, next) {
    var token = req.body.token || req.session.token;
    var id = req.params.id;
    
    // Need to implement relationship searching as well
    
    if (typeof token == 'undefined' || token == '') {
        res.status(HttpStatus.UNAUTHORIZED);
        res.send(
            {
                error : "Please log in before modifying goals.",
                goal : null
            }
        );
        return;
    }
    else {
        var userId = TokenHashTable.getId(token);
        if (userId == -1) {
            // Token does not exist
            res.status(HttpStatus.UNAUTHORIZED);
            res.send(
                {
                    error : "Your access token has expired. Please login again.",
                    goal : null
                }
            );
            return;
        }
        else {
            var data = dummyGoalData;
            
            for (var i = 0; i <= data.goals.length; i++) {
                if (i == data.goals.length) {
                    // Goal is not found!
                    res.status(HttpStatus.NOT_FOUND);
                    res.send(
                        {
                            error : "This goal doesn't exist. Please refresh your page.",
                            goal : null
                        }
                    );
                    return;
                }
                else if (data.goals[i].id == id && data.goals[i].userId == userId) {
                    data.goals[i].splice(i, 1);
                    
                    console.log("Deleting goal " + id);
                    
                    res.status(HttpStatus.NO_CONTENT);
                    res.send(
                        {
                            error : null,
                            goal : null
                        }
                    );
                    return;
                }
            }
        }
    }
});

// Regular web server routing

router.get('/new', function (req, res, next) {
    if (!req.session.user)
        return res.redirect("/user/login");
    else
        return res.render('goal/new', {
            token: req.session.token,
            user: req.session.user
        });
});

/* GET goal listing. */
router.get('/', function(req, res, next) {
    return res.render('goal/list');
});

module.exports = router;
