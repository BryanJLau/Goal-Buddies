var mongoose = require('mongoose');
var GoalModel = require('./goalModel');

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
    
    personal: {
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
        dateCreated: {
            type: Date,
            default: Date.now
        }
    },    
    
    statistics: {
        motivationsReceived: {
            type: Number,
            default: 0
        },
        motivationsGiven: {
            type: Number,
            default: 0
        },
        daysSaved: {
            type: Number,
            default: 0
        },
        
        totalGoals: {
            type: Number,
            default: 0
        },
        goalsCompleted: {
            type: Number,
            default: 0
        }
    },
    
    premiumTier: {
        type: Number,
        default: 0
    },
    
    notifications: [
        {
            notification: String,
            date: {
                type: Date,
                default: Date.now
            }
        }
    ],
    
    motivation: {
        lastMotivated: {
            type: Date,
            default: null
        },
        motivators: [ String ],
    },
    
	relationships: {
        // Hold the usernames of relationships
        friends: [ String ],
        incoming: [ String ],
        outgoing: [ String ],
        blocking: [ String ]
    },
    
    // Embedding goals now, since we have a limit on the arrays
    // This should help ease computing and allow the client to do
    // more work, while still given all the data
    goals: {
        // Actual goals
        pendingRecurring: [ GoalModel.schema ],
        pendingOneTime: [ GoalModel.schema ],
        finishedRecurring: [ GoalModel.schema ],
        finishedOneTime: [ GoalModel.schema ],
        major: [ GoalModel.schema ]
    },
});

// Create an index on username
UserSchema.index({ username: 1 });

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);