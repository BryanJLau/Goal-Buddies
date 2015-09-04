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

/*
 * Login function
 * Parameters:
 *      username : Your username
 *      password : Your password
 * Returns:
 *      statusCode : OK (200) if successful, Unauthorized (401) on failure
 *      token : A unique token (application specific) required for
 *              other functions
 *      user : A JSONObject representing your user details
 */
router.post('/login', middle.cleanBody, function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    
    if (typeof username == 'undefined' || typeof password == 'undefined' ||
        username == "" || password == "") {
        // Some parameters are missing
        errorHandler.missingParameters(res);
    }
    else {
        UserModel.findOne({ 'username': username }, function (err, user) {
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
                res.status(HttpStatus.OK);
                return res.json(
                    {
                        token : jwt.sign(
                            trimmedUser,
                            config.tokenSecret,
                            { expiresInMinutes: 1440 }  // expires in 24 hours
                        ),
                        // This is used in any apps that need to save the credentials
                        // such as the Android app
                        user : trimmedUser,
                        expires : new Date().getTime() + 24 * 3600000   // Send expiration time as well
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
 *      user : A JSONObject representing your user details
 */
router.post('/', middle.cleanBody, function (req, res, next) {
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

        // Not all fields were entered
        console.log("Attempted registration, missing fields.");
        errorHandler.missingParameters(res);
    }
    else {
        var newUser = new UserModel();
        newUser.username = username;
        newUser.password = bcrypt.hashSync(password);
        newUser.firstName = firstName;
        newUser.lastName = lastName;
        newUser.city = city;

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
                    // Something weird happened
                    errorHandler.logError(err, res);
                }
            }
            
            else {
                var newGoal = new GoalModel();
                newGoal.userId = newUser._id;
                newGoal.description = "Create a goal and get at it using Goal Buddies!";
                newGoal.type = 1;
                
                newGoal.save(function (gerr) {
                    console.log(gerr);
                    if (!gerr) {
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
                                    { expiresInMinutes: 1440 }  // expires in 24 hours
                                ),
                                user : trimmedUser,
                                expires : new Date().getTime() + 24 * 3600000   // Send expiration time as well
                            }
                        );
                    }
                    else {
                        // Something weird happened
                        errorHandler.logError(err, res);
                    }
                });
            }
        });
    }
});

module.exports = router;