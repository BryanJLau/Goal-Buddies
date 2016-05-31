var HttpStatus = require('http-status-codes');

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

exports.badRequest = function (res) {
    res.status(HttpStatus.BAD_REQUEST);
    return res.json(
        {
            statusCode : HttpStatus.BAD_REQUEST,
            devError : "The request was bad. Please contact the developer " +
                       "with as much detail as possible.",
            error : "Sorry, something went wrong! Please try again later."
        }
    );
}

exports.relationFunctionInProgress = function (res) {
    res.status(HttpStatus.BAD_REQUEST);
    return res.json(
        {
            statusCode : HttpStatus.BAD_REQUEST,
            devError : "Another relationship function is already in " +
                       "progress right now. Please refresh your view.",
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

exports.targetUserNotFound = function (res) {
    res.status(HttpStatus.NOT_FOUND);
    return res.json(
        {
            statusCode : HttpStatus.NOT_FOUND,
            devError : "The user with the desired username was not found. " +
                       "Please prompt the user for another username.",
            error : "The target user was not found. Please try another " +
                    "username."
        }
    );
}

exports.alreadyMotivatedToday = function (res) {
    res.status(HttpStatus.BAD_REQUEST);
    return res.json(
        {
            statusCode : HttpStatus.BAD_REQUEST,
            devError : "The user has already been motivated by this user " +
                        "today.",
            error : "You have already motivated this person today!"
        }
    );
}

exports.targetUserNotFriend = function (res) {
    res.status(HttpStatus.UNAUTHORIZED);
    return res.json(
        {
            statusCode : HttpStatus.UNAUTHORIZED,
            devError : "The user is not friends with the target user.",
            error : "The target user is not a friend. Try sending them " +
                    "a request!"
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

exports.goalFinishedToday = function (res) {
    res.status(HttpStatus.BAD_REQUEST);
    return res.json(
        {
            statusCode : HttpStatus.BAD_REQUEST,
            devError : "The goal was already finished today. Please refresh "+
                       "your view to disable this option.",
            error : "This goal was already finished today!"
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