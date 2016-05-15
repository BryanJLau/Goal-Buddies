var mongoose = require('mongoose');
//var GoalModel = require('./goalModel');
//var bcrypt = require('bcrypt-nodejs');

var d = new Date();

// Define our user schema
var UserSchema = new mongoose.Schema( {
    username: {
        type: String,
        unique: true,
        minlength: [
            5,  // min value
            "The field '{PATH}' ('{VALUE}') is shorter than the minimum allowed length ({MINLENGTH})."
        ]
    },
    password: {
        type: String,
        required: [
            true,
            "The field '{PATH}' is required."
        ]
    },
    firstName: {
        type: String,
        required: [
            true,
            "The field '{PATH}' is required."
        ]
    },
    lastName: {
        type: String,
        required: [
            true,
            "The field '{PATH}' is required."
        ]
    },
    city: {
        type: String,
        required: [
            true,
            "The field '{PATH}' is required."
        ]
    },
    
    // The following fields are automatically generated
    dateCreated: {
        type: Date,
        default: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime(),
    },
    premium: {
        type: Boolean,
        default: false
    },
    goalsCompleted: {
        type: Number,
        default: 0
    },
    totalGoals: {
        type: Number,
        default: 0
    },
    timesMotivated: {
        type: Number,
        default: 0
    },
    
    lastMotivated: {
        type: Date,
        default: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime(),
    },
    motivators: [ String ],
	
	// Hold the usernames of relationships
	friends: [ String ],
	incoming: [ String ],
	outgoing: [ String ],
	blocked: [ String ],
    
    // NOT going to embed goals, never need to join, need to text search
    // Text search will return the entire user if it contains a goal
    // with the specified text, no way to aggregate to return only goals
    // with the search query.
    //goals: [ GoalModel.schema ],
    version: {
        type: Number,
        default: 0
    },
});

// Create an index on username
UserSchema.index({ username: 1 });

// Compare passwords
/*
UserSchema.methods.verifyPassword = function (password, cb) {
    bcrypt.compare(password, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};
 * */

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);