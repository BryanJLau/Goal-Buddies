var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var salt = "SomeoneBlameGregForNotHelping";

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
        default: Date.now
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
    
    // Embed goals into the user document
    goals: [
        {
            // Goal schema
            // For the identifier, use built-in _id
            description: String,
            type: Number,
            pending: Boolean,
            unread: Boolean,
            created: Date,
            eta: Date,
            finished: Date,
            times: Number,
            version: Number
        }
    ],
    version: {
        type: Number,
        default: 0
    },
});

// Create an index on username
UserSchema.index({ username: 1 });

// Compare passwords
UserSchema.methods.verifyPassword = function (password, cb) {
    bcrypt.compare(password, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);