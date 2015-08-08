var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var bcrypt = require('bcrypt-nodejs');
var sanitize = require('mongo-sanitize');
var config = require('../config');
var jwt = require('jsonwebtoken');
var middle = require('./commonMiddleware');

// Middleware to sanitize against nosql attacks
function cleanBody(req, res, next) {
    req.body = sanitize(req.body);
    next();
}

var UserModel = require('../models/userModel');

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
router.post('/login', cleanBody, function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    
    if (typeof username == 'undefined' || typeof password == 'undefined' ||
        username == "" || password == "") {
        // Some parameters are missing
        res.status(HttpStatus.BAD_REQUEST);
        res.json(
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
        UserModel.findOne({ 'username': username }, function (err, user) {
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
router.post('/', cleanBody, function (req, res, next) {
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
        res.status(HttpStatus.BAD_REQUEST);
        res.json(
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
                    res.json(
                        {
                            statusCode : HttpStatus.CONFLICT,
                            devError : "Username conflict with requested username.",
                            error : "This username has already been taken."
                        }
                    );
                }
                else {
                    // In case the above field existence checking isn't enough
                    console.log("Attempted registration, missing fields.");
                    res.status(HttpStatus.BAD_REQUEST);
                    res.json(
                        {
                            statusCode : HttpStatus.BAD_REQUEST,
                            devError : "Not all required fields were sent to the server. " +
                            "Make sure the user has inputted all fields, and that you have " +
                            "sent all the fields as well.",
                            error : "Please fill in all required fields."
                        }
                    );
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
                res.json(
                    {
                        token : jwt.sign(
                            trimmedUser,
                            config.tokenSecret,
                            { expiresInMinutes: 1440 }  // expires in 24 hours
                        ),
                        user : trimmedUser
                    }
                );
            }
        });
    }
});

module.exports = router;