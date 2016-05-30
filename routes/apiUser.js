var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var bcrypt = require('bcrypt-nodejs');
var config = require('../config');
var jwt = require('jsonwebtoken');
var middle = require('./commonMiddleware');
var errorHandler = require('../lib/errorHandler');

var UserModel = require('../models/userModel');
var GoalModel = require('../models/goalModel');

// Auxiliary function to remove a username from an array
function removeUsername(targetArray, username) {
    var i = 0;
    for(; i < targetArray.length; i++) {
        if(targetArray[i] == username) break;
    }
    
    targetArray.splice(i, 1);
}

// Auxiliary function to handle prep for social functions
function prepSocial(req, res, callback) {
    var username = req.params.username;
    if (typeof username == 'undefined' || username == '') {
        errorHandler.missingParameters(res);
    } else if(username == req.user.username) {
        // You can't request to be friends with yourself!
        errorHandler.badRequest(res);
    } else {
        // Find both users
        UserModel.findOne({username: req.user.username}, function(err, you) {
            if(err) {
                errorHandler.logError(err, res);
            } else if (!you) {
                errorHandler.userNotFound(res);
            } else {
                UserModel.findOne({username: req.params.username}, function(err, them) {
                    if(err) {
                        errorHandler.logError(err, res);
                    } else if (!them) {
                        errorHandler.targetUserNotFound(res);
                    } else {
                        callback(you, them);
                    }
                });
            }
        });
    }
}

/*
 * Login function
 * Parameters:
 *      username : Your username
 *      password : Your password
 * Returns:
 *      statusCode : OK (200) if successful, Unauthorized (401) on failure
 *      token : A unique token (application specific) required for
 *              other functions
 */
router.post('/login', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    
    if (typeof username == 'undefined' || typeof password == 'undefined' ||
        username == "" || password == "") {
        // Some parameters are missing
        errorHandler.missingParameters(res);
    }
    else {
        UserModel.findOne({ 'username': username }, "username password", function (err, user) {
            if (err || !user || !bcrypt.compareSync(password, user.password)) {
                // Invalid credentials
                res.status(HttpStatus.UNAUTHORIZED);
                return res.json(
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
                // Success
                res.status(HttpStatus.OK);
                return res.json(
                    {
                        token : jwt.sign(
                            trimmedUser,
                            config.tokenSecret,
                            { expiresIn: 2629800 }  // expires in 1 month
                        )
                    }
                );
            }
        });
    }
});

/*
 * Register function
 * Parameters:
 *      username : Your username
 *      password : Your password
 *      firstname : Your first name
 *      lastname : Your last name
 *      city : Your current city of residence
 * Returns:
 *      statusCode : Created (201) if successful, Conflict (409) on failure
 *      token : A unique token (application specific) required for
 *              other functions
 */
router.post('/', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var city = req.body.city;

    if (typeof username == 'undefined' || typeof password == 'undefined' || 
        typeof firstName == 'undefined' || typeof lastName == 'undefined' || 
        typeof city == 'undefined' ||
        username == '' || password == '' || 
        firstName == '' || lastName == '' || 
        city == '') {

        errorHandler.missingParameters(res);
    }
    else {
        var newUser = new UserModel();
        newUser.username = username;
        newUser.password = bcrypt.hashSync(password);
        newUser.personal.firstName = firstName;
        newUser.personal.lastName = lastName;
        newUser.personal.city = city;
        
        var newGoal = new GoalModel();
        newGoal.description = "Create a goal and get at it using Goal Buddies!";
        newGoal.type = 1;
        newGoal.pending = true;
        newUser.goals.pendingOneTime.unshift(newGoal);

        newUser.save(function (err) {
            if (err) {
                if (err.code == "11000") {
                    console.log("Attempted registration, duplicate username: " + username + ".");

                    // Duplicate key
                    res.status(HttpStatus.CONFLICT);
                    return res.json(
                        {
                            statusCode : HttpStatus.CONFLICT,
                            devError : "Username conflict with requested username.",
                            error : "This username has already been taken."
                        }
                    );
                }
                else {
                    console.log(err.message);
                    // Something weird happened
                    errorHandler.logError(err, res);
                }
            }
            
            else {
                var trimmedUser = {
                    _id : newUser._id,
                    username : username
                };
                // Success
                console.log("Successfully registered user: " + username + ".");
                res.status(HttpStatus.CREATED);
                return res.json(
                    {
                        token : jwt.sign(
                            trimmedUser,
                            config.tokenSecret,
                            { expiresIn: 2629800 }  // expires in 1 month
                        )
                    }
                );
            }
        });
    }
});

/*
 * Get a user's details function
 * Parameters:
 *      username : The target user's username
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful
 *      user : A JSONObject representing the user's available details
 */
router.get('/search/:username?', middle.verifyToken, function (req, res, next) {
    // Set the username match to someone else, or yourself
    var userMatchObject = {
        username : req.params.username ? req.params.username : req.user.username
    }
    
    UserModel.findOne(userMatchObject, function(err, user) {
        if(err) {
            errorHandler.logError(err, res);
        } else {
            if(!user || user.relationships.blocking.indexOf(req.user.username) > -1) {
                errorHandler.userNotFound(res);
            } else {
                if(!req.params.username || req.params.username == req.user.username) {
                    // Want yourself, return everything!
                    return res.json({user: user});
                } else {
                    var today = new Date();
                    // Clear if it's been more than a day
                    if ((user.motivation.lastMotivated - today) > 86400000) {
                        user.motivators.length = 0;
                        user.save();
                    }
                    
                    // Mongoose may be protecting the resulting object
                    // making it so that we can't delete properties
                    // (even if we're not saving it back)
                    // So we'll just construct a new object instead
                    
                    // Simplify the social arrays to only contain you
                    // That way we can see your relation to this person
                    var resultUser = {
                        relationships: {
                            friends: [],
                            incoming: [],
                            outgoing: []
                        },
                        personal: {
                            firstName: "",
                            lastName: "",
                            city: user.personal.city,
                        },
                        statistics: user.statistics,
                        username: user.username
                    };
                    
                    if(user.relationships.friends.indexOf(req.user.username) > -1) {
                        // Friend
                        resultUser.relationships.friends.push(req.user.username);
                        resultUser.personal.firstName = user.personal.firstName;
                        resultUser.personal.lastName = user.personal.lastName;
                    } else if(user.relationships.incoming.indexOf(req.user.username) > -1) {
                        // You're requesting friendship
                        resultUser.relationships.incoming.push(req.user.username);
                    } else if(user.relationships.outgoing.indexOf(req.user.username) > -1) {
                        // They're requesting friendship
                        resultUser.relationships.outgoing.push(req.user.username);
                    }
                    
                    return res.json({user: resultUser});
                }
            }
        }
    });
});

/*
 * Request a friendship with another user
 * Parameters:
 *      username : The target user's username
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful, Bad Request (400) on failure
 */
router.post('/social/request/:username?', middle.verifyToken, function (req, res, next) {
    prepSocial(req, res, foundBoth);
    
    function foundBoth(you, them) {
        var yourUsername = you.username;
        var theirUsername = them.username;
        
        if(you.relationships.blocked.indexOf(theirUsername) > -1 ||
           them.relationships.blocked.indexOf(yourUsername) > -1) {
            // Someone blocked someone
            errorHandler.targetUserNotFound(res);
        } else if (you.relationships.incoming.indexOf(theirUsername) > -1 ||
                   them.relationships.incoming.indexOf(yourUsername) > -1 ||
                   you.relationships.outgoing.indexOf(theirUsername) > -1 ||
                   them.relationships.outgoing.indexOf(yourUsername) > -1 ){
            // You can't request when a request is already in progress
            errorHandler.relationFunctionInProgress(res);
        } else if (you.relationships.friends.indexOf(theirUsername) > -1 ||
                   them.relationships.friends.indexOf(yourUsername) > -1 ){
            // You can't request when you're already friends
            errorHandler.relationFunctionInProgress(res);
        } else {
            // Everything is fine, update and save
            you.relationships.outgoing.push(theirUsername);
            you.save(function(err) {
                if(err) {
                    errorHandler.logError(err, res);
                } else {
                    them.relationships.incoming.push(yourUsername);
                    them.save(function(err) {
                        if(err) {
                            // Undo your outgoing array because it was pushed
                            removeUsername(you.relationships.outgoing, theirUsername);
                            you.save(function(yourErr) {
                                if(yourErr) {
                                    errorHandler.logError(yourErr, res);
                                } else {
                                    errorHandler.logError(err, res);
                                }
                            });
                        } else {
                            return res.send({});
                        }
                    });
                }
            });
        }
    }
});

/*
 * Accept a friendship with another user
 * Parameters:
 *      username : The target user's username
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful, Bad Request (400) on failure
 */
router.post('/social/accept/:username?', middle.verifyToken, function (req, res, next) {
    prepSocial(req, res, foundBoth);
    
    function foundBoth(you, them) {
        var yourUsername = you.username;
        var theirUsername = them.username;
        
        if(you.relationships.incoming.indexOf(theirUsername) > -1 &&
           them.relationships.outgoing.indexOf(yourUsername) > -1) {
            // All good, proceed
            
            you.relationships.friends.push(theirUsername);
            removeUsername(you.relationships.incoming, theirUsername);
            you.save(function(err) {
                if(err) {
                    errorHandler.logError(err, res);
                } else {
                    // Change the other user
                    them.relationships.friends.push(yourUsername);
                    removeUsername(them.relationships.outgoing, yourUsername);
                    them.save(function (err) {
                        if(err) {
                            // Rollback your incoming and friends list
                            removeUsername(you.relationships.friends, theirUsername);
                            you.relationships.incoming.push(theirUsername);
                            you.save(function(yourErr) {
                                if(yourErr) {
                                    errorHandler.logError(yourErr, res);
                                } else {
                                    errorHandler.logError(err, res);
                                }
                            });
                        } else {
                            return res.send({});
                        }
                    });
                }
            });
        } else {
            errorHandler.relationFunctionInProgress(res);
        }
    }
});

/*
 * Reject a friendship with another user
 * Parameters:
 *      username : The target user's username
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful, Bad Request (400) on failure
 */
router.post('/social/reject/:username?', middle.verifyToken, function (req, res, next) {
    prepSocial(req, res, foundBoth);
    
    function foundBoth(you, them) {
        var yourUsername = you.username;
        var theirUsername = them.username;
        
        if(you.relationships.incoming.indexOf(theirUsername) > -1 &&
           them.relationships.outgoing.indexOf(yourUsername) > -1) {
            // All good, proceed
            
            removeUsername(you.relationships.incoming, theirUsername);
            you.save(function(err) {
                if(err) {
                    errorHandler.logError(err, res);
                } else {
                    // Change the other user
                    removeUsername(them.relationships.outgoing, yourUsername);
                    them.save(function (err) {
                        if(err) {
                            // Rollback your incoming list
                            you.relationships.incoming.push(theirUsername);
                            you.save(function(yourErr) {
                                if(yourErr) {
                                    errorHandler.logError(yourErr, res);
                                } else {
                                    errorHandler.logError(err, res);
                                }
                            });
                        } else {
                            return res.send({});
                        }
                    });
                }
            });
        } else {
            errorHandler.relationFunctionInProgress(res);
        }
    }
});

/*
 * Cancel a request with another user
 * Parameters:
 *      username : The target user's username
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful, Bad Request (400) on failure
 */
router.post('/social/cancel/:username?', middle.verifyToken, function (req, res, next) {
    prepSocial(req, res, foundBoth);
    
    function foundBoth(you, them) {
        var yourUsername = you.username;
        var theirUsername = them.username;
        
        if(you.relationships.outgoing.indexOf(theirUsername) > -1 &&
           them.relationships.incoming.indexOf(yourUsername) > -1) {
            // All good, proceed
            
            removeUsername(you.relationships.outgoing, theirUsername);
            you.save(function(err) {
                if(err) {
                    errorHandler.logError(err, res);
                } else {
                    // Change the other user
                    removeUsername(them.relationships.incoming, yourUsername);
                    them.save(function (err) {
                        if(err) {
                            // Rollback your incoming list
                            you.relationships.outgoing.push(theirUsername);
                            you.save(function(yourErr) {
                                if(yourErr) {
                                    errorHandler.logError(yourErr, res);
                                } else {
                                    errorHandler.logError(err, res);
                                }
                            });
                        } else {
                            return res.send({});
                        }
                    });
                }
            });
        } else {
            errorHandler.relationFunctionInProgress(res);
        }
    }
});

/*
 * Block another user
 * Parameters:
 *      username : The target user's username
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful, Bad Request (400) on failure
 */
router.post('/social/block/:username?', middle.verifyToken, function (req, res, next) {
    prepSocial(req, res, foundBoth);
    
    function foundBoth(you, them) {
        var yourUsername = you.username;
        var theirUsername = them.username;
        
        if(you.relationships.blocked.indexOf(theirUsername) > -1 ||
           them.relationships.blocked.indexOf(yourUsername) > -1) {
            // Someone blocked someone
            errorHandler.targetUserNotFound(res);
        } else if (you.relationships.incoming.indexOf(theirUsername) > -1 ||
                   them.relationships.incoming.indexOf(yourUsername) > -1 ||
                   you.relationships.outgoing.indexOf(theirUsername) > -1 ||
                   them.relationships.outgoing.indexOf(yourUsername) > -1 ){
            // You can't request when a request is already in progress
            errorHandler.relationFunctionInProgress(res);
        } else if (you.relationships.friends.indexOf(theirUsername) > -1 ||
                   them.relationships.friends.indexOf(yourUsername) > -1 ){
            // You can't request when you're already friends
            errorHandler.relationFunctionInProgress(res);
        } else {
            // Everything is fine, update and save
            you.relationships.blocked.push(theirUsername);
            you.save(function(err) {
                if(err) {
                    errorHandler.logError(err, res);
                } else {
                    // Don't need to modify the other user, we don't
                    // want them to know anything happened
                    return res.send({});
                }
            });
        }
    }
});

/*
 * Unfriend a user
 * Parameters:
 *      username : The target user's username
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful, Bad Request (400) on failure
 */
router.post('/social/unfriend/:username?', middle.verifyToken, function (req, res, next) {
    prepSocial(req, res, foundBoth);
    
    function foundBoth(you, them) {
        var yourUsername = you.username;
        var theirUsername = them.username;
        
        if(you.relationships.friends.indexOf(theirUsername) > -1 &&
           them.relationships.friends.indexOf(yourUsername) > -1) {
            // All good, proceed
            
            removeUsername(you.relationships.friends, theirUsername);
            you.save(function(err) {
                if(err) {
                    errorHandler.logError(err, res);
                } else {
                    // Change the other user
                    removeUsername(them.relationships.friends, yourUsername);
                    them.save(function (err) {
                        if(err) {
                            // Rollback your incoming list
                            you.relationships.friends.push(theirUsername);
                            you.save(function(yourErr) {
                                if(yourErr) {
                                    errorHandler.logError(yourErr, res);
                                } else {
                                    errorHandler.logError(err, res);
                                }
                            });
                        } else {
                            return res.send({});
                        }
                    });
                }
            });
        } else {
            errorHandler.relationFunctionInProgress(res);
        }
    }
});



/*
 * Unblock a user
 * Parameters:
 *      username : The target user's username
 *      token : Your personal access token
 * Returns:
 *      statusCode : OK (200) if successful, Bad Request (400) on failure
 */
router.post('/social/unblock/:username?', middle.verifyToken, function (req, res, next) {
    prepSocial(req, res, foundBoth);
    
    function foundBoth(you, them) {
        var yourUsername = you.username;
        var theirUsername = them.username;
        
        if(you.relationships.blocked.indexOf(theirUsername) > -1) {
            // All good, proceed
            
            removeUsername(you.relationships.blocked, theirUsername);
            you.save(function(err) {
                if(err) {
                    errorHandler.logError(err, res);
                } else {
                    return res.send({});
                }
            });
        } else {
            errorHandler.relationFunctionInProgress(res);
        }
    }
});

module.exports = router;