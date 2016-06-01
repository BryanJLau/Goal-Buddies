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
            default: 1
        },
        goalsCompleted: {
            type: Number,
            default: 0
        }
    },
    
    premium: {
        tier: {
            type: Number,
            default: 0
        },
        expires: {
            type: Date,
            default: null
        }
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
        type: {
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
                default: {},
                select: false
            },
            lastMotivator: {
                type: String,
                default: null
            }
        },
        select: false
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
        pendingRecurring: [ GoalModel.schema ],
        pendingOneTime: [ GoalModel.schema ],
        finishedRecurring: [ GoalModel.schema ],
        finishedOneTime: [ GoalModel.schema ],
        major: [ GoalModel.schema ]
    }
});

UserSchema.pre('save', function(next) {
    var d = new Date();
    var today = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    
    // Handle the motivation here
    if(this.motivation) {
        // This should only occur on a motivation, so it's safe
        if(!this.motivation.motivators[this.motivation.lastMotivator]) {
            // Not set, so add it
            this.motivation.motivators[this.motivation.lastMotivator] = 1;
        } else {
            this.motivation.motivators[this.motivation.lastMotivator]++;
        }
        
        this.motivation.lastMotivated = today;
        
        this.markModified('motivation');
    }
    
    // Truncate notifications to 10
    if(this.notifications) {
        while(this.notifications.length > 10) {
            this.notifications.pop();
        }
        this.markModified('notifications');
    }
    
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
    switch(this.premium.tier) {
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
    
    // For some reason, goals can be empty
    if(goalsObject && Object.keys(goalsObject).length === 0) {
        // Truncate goal lists, in case you had premium and it expired
        // Have to leave one extra goal in case you just tried adding it
        while(goalsObject.pendingRecurring.length > limitObject.pending + 1) {
            goalsObject.pendingRecurring.pop();
        }
        while(goalsObject.pendingOneTime.length > limitObject.pending + 1) {
            goalsObject.pendingOneTime.pop();
        }
        // Finished goals don't really matter, truncate them
        while(goalsObject.finishedRecurring.length > limitObject.finished) {
            goalsObject.finishedRecurring.pop();
        }
        while(goalsObject.finishedOneTime.length > limitObject.finished) {
            goalsObject.finishedOneTime.pop();
        }
        while(goalsObject.major.length > limitObject.major) {
            goalsObject.major.pop();
        }
        
        // Handle if you try to make one more goal over the limit
        if(
            (goalsObject.pendingRecurring.length == limitObject.pending + 1) ||
            (goalsObject.pendingOneTime.length == limitObject.pending + 1)
        ) {
            var err = new Error('Goal list capacity exceeded.');
            err.statusCode = HttpStatus.BAD_REQUEST;
            err.error = "You have too many goals. Try finishing or deleting " +
                        "some goals first.";
            err.devError = "User's goal list capacity exceeded. Prompt the user " +
                        " to finish or delete goals first.";
                        console.log(err);
            return next(err);
        } else {            
            // Sort the goal lists, and save
            function goalFinishSort(goal1, goal2) {
                return goal1.dates.finished < goal2.dates.finished;
            }
            
            goalsObject.pendingRecurring.sort(goalFinishSort);
            goalsObject.pendingOneTime.sort(goalFinishSort);
            goalsObject.finishedRecurring.sort(goalFinishSort);
            goalsObject.finishedOneTime.sort(goalFinishSort);
            goalsObject.major.sort(goalFinishSort);
        }
    }
            
    next();
});

// Create an index on username
UserSchema.index({ username: 1 });

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);