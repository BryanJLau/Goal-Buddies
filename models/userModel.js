var mongoose = require('mongoose');
var HttpStatus = require('http-status-codes');
var GoalModel = require('./goalModel');

/*
 * Shamelessly adapted from:
 * http://stackoverflow.com/questions/1027224/how-can-i-test-if-a-letter-in-a-string-is-uppercase-or-lowercase-using-javascrip/9728437#answer-9728437
 */
// Check for an uppercase letter, for people who don't capitalize
function capitalizeName(name) {
    var nameArray = name.split(" ");
    
    for(var j = 0; j < nameArray.length; j++) {
        var subName = nameArray[j];
        var i = 0;
        for (; i < subName.length; i++) {
            if (subName[i] === subName[i].toUpperCase()
                && subName[i] !== subName[i].toLowerCase()) {
                break;
            }
        }
        
        if(i == name.length) {
            // No uppercase found, replace it!
            nameArray[j] = subName.charAt(0).toUpperCase() + subName.slice(1);
        }
    }
    
    return nameArray.join(" ");
}

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
        ],
        select: false
    },
    
    personal: {
        firstName: {
            type: String,
            required: [
                true,
                "The field '{PATH}' is required."
            ],
            set: capitalizeName
        },
        lastName: {
            type: String,
            required: [
                true,
                "The field '{PATH}' is required."
            ],
            set: capitalizeName
        },
        city: {
            type: String,
            required: [
                true,
                "The field '{PATH}' is required."
            ],
            set: capitalizeName
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
        // For simplicity, motivators should be a hash table
        // with { username, count } to keep track
        // But we have to .markModified(motivation) every time
        // a motivation is given
        motivators: {
            type: {},
            default: {}
        },
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
    }
});

UserSchema.pre('save', function(next) {
    // Validation
    
    /*
     * Tier limitations table
     * +======+=========+==========+=======+=========+======================+
     * | Tier | Pending | Finished | Major | Privacy | Motivations/user/day |
     * +======+=========+==========+=======+=========+======================+
     * |   -1 |      20 |       20 |    20 |     YES |                    5 |
     * +======+=========+==========+=======+=========+======================+
     * |    0 |       5 |       10 |     5 |      NO |                    1 |
     * +======+=========+==========+=======+=========+======================+
     * |    1 |       7 |       10 |     7 |     YES |                    2 |
     * +======+=========+==========+=======+=========+======================+
     * |    5 |      20 |       20 |    10 |     YES |                    5 |
     * +======+=========+==========+=======+=========+======================+
     */
    
    var limitObject = {};
    
    var goalsObject = this.goals;
    switch(this.premiumTier) {
        // Beta users
        case -1:
            limitObject.pending = 20;
            limitObject.finished = 20;
            limitObject.major = 20;
            break;
        // Basic tier
        case 1:
            limitObject.pending = 7;
            limitObject.finished = 10;
            limitObject.major = 7;
            break;
        // Plus tier
        case 5:
            limitObject.pending = 20;
            limitObject.finished = 20;
            limitObject.major = 10;
            break;
        // Free tier, also default
        case 0:
        default:
            limitObject.pending = 5;
            limitObject.finished = 10;
            limitObject.major = 5;
            break;
    }
    
    if (
        goalsObject.pendingRecurring.length > limitObject.pending ||
        goalsObject.pendingOneTime.length > limitObject.pending ||
        goalsObject.finishedRecurring.length > limitObject.finished ||
        goalsObject.finishedOneTime.length > limitObject.finished ||
        goalsObject.major.length > limitObject.major
    ) {
        var err = new Error('Goal list capacity exceeded.');
        err.statusCode = HttpStatus.BAD_REQUEST;
        err.error = "You have too many goals. Try finishing or deleting " +
                    "some goals first.";
        err.devError = "User's goal list capacity exceeded. Prompt the user " +
                       " to finish or delete goals first.";
                       console.log(err);
        next(err);
    } else {
        next();
    }
});

// Create an index on username
UserSchema.index({ username: 1 });

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);