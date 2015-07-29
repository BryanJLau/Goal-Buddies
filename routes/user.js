var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');

var TokenHashTable = require('../TokenHashTable.js');

var dummyUserData = {
    "users" : [
        {
            id : 0,
            username : "user1",
            password : "pwd123"
        },
        {
            id : 1,
            username : "user2",
            password : "pwd1234"
        },
        {
            id : 2,
            username : "user11",
            password : "pwd1234"
        }
    ]
}

// This module is just a proof of concept, should just be its own module with exports
var UserModule = (function () {
    // Private
    var data;

    return {
        // Public
        
        // Create a user given details
        createUser : function (username, password, next) {
            data = dummyUserData;
            for (var i = 0; i <= data["users"].length; i++) {
                if (i == data["users"].length) {
                    console.log("Creating user " + i);
                    // No user exists!
                    var user = {
                        id : i,
                        username : username,
                        password : password
                    }
                    dummyUserData.users.push(user);
                    
                    var token = TokenHashTable.createNewHash(i);
                    
                    next(token, user);
                    return;
                }
                else {
                    if (data["users"][i].username == username) {
                        next("", null);
                        return;
                    }
                }
            }
        },  // End createUser

        // Get the user object given details
        findUser : function (username, password, next) {
            // Put SQL code here
            data = dummyUserData;
            for (var i = 0; i <= data["users"].length; i++) {
                // Need this because asynchronous
                if (i == data["users"].length) {
                    next("", null);
                    return;
                }
                else {
                    var user = data["users"][i];
                    if (user.username == username && user.password == password) {
                        var token = TokenHashTable.createNewHash(user.id);

                        next(token, user);
                        return;
                    }
                }
            }
        }   // End findUser
    }
}());

//  API FUNCTIONS

/*
 * Login function
 * Parameters:
 *      username : Your username
 *      password : Your password
 * Returns:
 *      statusCode : Created (201) if successful, Unauthorized (401) on failure
 *      error : An error message in case of incorrect credentials
 *              or server errors
 *      token : A unique token (application specific) required for
 *              other functions
 *      user : A JSONObject representing your user details
 */
// Will throw an error saying: "Can't set headers afer they're sent"
// I can't pinpoint where this occurs, but seems harmless enough
router.post('/login', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    
    var loginCallback = function (token, userObject) {
        if (userObject) {     // Login was successful
            console.log("User " + userObject.id + " has logged in.");
            res.status(HttpStatus.CREATED);
            res.send(
                {
                    error : null,
                    token : req.session.token = token,
                    user : req.session.user = userObject
                }
            );
        }
        else {
            // This section is called anyway for some unknown reason
            res.status(HttpStatus.UNAUTHORIZED);
            res.send(
                {
                    error : "401 Unauthorized",
                    token : null,
                    user : null
                }
            );
        }
    }
    
    UserModule.findUser(username, password, loginCallback);
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
 *      error : An error message in case of incorrect credentials
 *              or server errors
 *      token : A unique token (application specific) required for
 *              other functions
 *      user : A JSONObject representing your user details
 */
router.post('/', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var city = req.body.city;
    
    var registerCallback = function (token, userObject) {
        if (userObject) {     // Login was successful
            req.session.token = token;
            req.session.user = userObject;

            res.status(HttpStatus.CREATED);
            res.send(
                {
                    error : null,
                    token : req.session.token = token,
                    user : req.session.user = userObject
                }
            );
        }
        else {
            res.status(HttpStatus.CONFLICT);
            res.send(
                {
                    error : "409 Conflict",
                    token : null,
                    user : null
                }
            );
        }
    }
    
    UserModule.createUser(username, password, registerCallback);
});

/*
 * Register function
 * There are no parameters or return data.
 */
router.get('/logout', function (req, res, next) {
    if(req.session.token)
        TokenHashTable.deleteToken(req.session.token);
    if (req.session.user)
        console.log("User " + req.session.user.id + " has logged out.");

    req.session.user = null;
    req.session.token = null;
    res.redirect("/");
});

// Regular web server routing

/* GET users listing. */
router.get('/', function (req, res, next) {
    if (req.session.user)
        res.redirect("/goal/list");  // User is already logged in
    else
        res.render('user/login');
});

router.get('/login', function (req, res, next) {
    if (req.session.user)
        res.redirect("/goal/list");  // User is already logged in
    else
        res.render('user/login');
});

router.get('/register', function (req, res, next) {
    if (req.session.user)
        res.redirect("/goal/list");  // User is already logged in
    else
        res.render('user/register');
});

module.exports = router;