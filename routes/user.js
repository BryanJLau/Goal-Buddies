var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var middle = require('./commonMiddleware');

var User = require('../models/userModel');

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
                    
                    var MongoUser = new User();
                    MongoUser.username = username;
                    MongoUser.password = password;
                    MongoUser.save(function (err) {
                        if (err)
                            console.log(err);
                        
                        console.log(MongoUser);
                    });

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

// Regular web server routing

/* GET users listing. */
router.get('/', middle.checkToken, function (req, res, next) {
    if (req.user)
        return res.redirect("/goals");  // User is already logged in
    else
        return res.render('user/login');
});

router.get('/login', middle.checkToken, function (req, res, next) {
    if (req.user)
        return res.redirect("/goals");  // User is already logged in
    else
        return res.render('user/login');
});

router.get('/register', middle.checkToken, function (req, res, next) {
    if (req.user)
        return res.redirect("/goals");  // User is already logged in
    else
        return res.render('user/register');
});

module.exports = router;