﻿var HttpStatus = require('http-status-codes');

// This is used for any generic error, log it and 
exports.logError = function (err, res) {
    console.log(err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR);
    return res.json(
        {
            statusCode : HttpStatus.INTERNAL_SERVER_ERROR,
            devError : "Something went wrong with the server. " +
                       "Please contact the developer about this.",
            error : "Sorry, something went wrong! Please try again later."
        }
    );
}

exports.userNotFound = function (res) {
    res.status(HttpStatus.NOT_FOUND);
    return res.json(
        {
            statusCode : HttpStatus.NOT_FOUND,
            devError : "The token's user is not found. Perhaps " +
                       "the token was corrupted?",
            error : "Your access token is not valid. Please login again."
        }
    );
}

exports.goalNotFound = function (res) {
    res.status(HttpStatus.NOT_FOUND);
    return res.json(
        {
            statusCode : HttpStatus.NOT_FOUND,
            devError : "The goal was not found. Make sure you do not alter " +
                       "the goal id before sending a request using it, or " +
                       "try refreshing the goal list.",
            error : "The goal wasn't found. Please refresh your goal list " +
                    "and then try again."
        }
    );
}

exports.missingParameters = function (res) {
    res.status(HttpStatus.BAD_REQUEST);
    return res.json(
        {
            statusCode : HttpStatus.BAD_REQUEST,
            devError : "Not all required fields were sent to the server. " +
                       "Make sure the user has inputted all fields, and " +
                       "that you have sent all the fields as well.",
            error : "Please fill in all required fields."
        }
    );
}

exports.completedGoal = function (res) {
    res.status(HttpStatus.BAD_REQUEST);
    return res.json(
        {
            statusCode : HttpStatus.BAD_REQUEST,
            devError : "The goal being edited has already been " +
                       "completed. Please update the goal list before attempting " +
                       "to perform more actions.",
            error : "You cannot edit an already completed goal."
        }
    );
}

// Token verification middleware
exports.invalidToken = function (res) {
    res.status(HttpStatus.UNAUTHORIZED);
    return res.json(
        {
            statusCode : HttpStatus.UNAUTHORIZED,
            devError : "An invalid token was passed. Please make sure " +
                       "you save the access token verbatim, and that it " +
                       "has not changed since receiving it.",
            error : "Failed to authenticate token. Please login again."
        }
    );
}

exports.expiredToken = function (res) {
    res.status(HttpStatus.UNAUTHORIZED);
    return res.json(
        {
            statusCode : HttpStatus.UNAUTHORIZED,
            devError : "The token has expired. Please redirect the user " +
                       "to the login screen, or attempt another " +
                       "authentication on their behalf.",
            error : "Your access token has expired. Please login again."
        }
    );
}

exports.tokenNotFound = function (res) {
    res.status(HttpStatus.UNAUTHORIZED);
    return res.json(
        {
            statusCode : HttpStatus.UNAUTHORIZED,
            devError : "No token was passed. Please submit a token with " +
                "your request to this resource.",
            error : "Please contact your app developer to submit your " +
                "access token.",
        }
    );
}