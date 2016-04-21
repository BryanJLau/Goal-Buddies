var express = require('express');
var router = express.Router();
var url = require('url');
var HttpStatus = require('http-status-codes');
var middle = require('./commonMiddleware');

var UserModel = require('../models/userModel');

// Regular web server routing

/* GET users listing. */
router.get('/', middle.checkToken, function (req, res, next) {
	if (req.user)
		return res.redirect("/goals");	// User is already logged in
	else
		return res.render('user/login');
});

router.get('/login', middle.checkToken, function (req, res, next) {
	if (req.user)
		return res.redirect("/goals");	// User is already logged in
	else
		return res.render('user/login');
});

router.get('/register', middle.checkToken, function (req, res, next) {
	if (req.user)
		return res.redirect("/goals");	// User is already logged in
	else
		return res.render('user/register');
});

router.get('/profile', middle.verifyToken, function (req, res, next) {
	var userMatchObject = {
		username : req.query.username
	}
	
	UserModel.findOne(userMatchObject, function(err, user) {
		if(user && user.blocked.indexOf(req.user.username) > -1) {
			user = null;
		}
		
		var returnJson = {
			user: user,
			you: req.user.username
		}
		
		return res.render('user/profile', returnJson);
	});
});

module.exports = router;