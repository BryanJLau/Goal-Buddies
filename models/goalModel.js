var mongoose = require('mongoose');

var d = new Date();

// Define our Goal schema
var GoalSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [
            true,
            "The field '{PATH}' is required."
        ]
    },
    type: {
        type : Number,
        required : [
            true,
            "The field '{PATH}' is required."
        ]
    },
    icon: {
        type : String,
        default : "star"
    },
    pending: {
        type : Boolean,
        required : [
            true,
            "The field '{PATH}' is required."
        ]
    },
    
    dates: {
        created: {
            type : Date,
            default : Date.now
        },
        // Acts as both an ETA and actual finish date
        finished: {
            type : Date,
            default : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime() + 86400000
        },
        lastMotivated: {
            type : Date,
            default : null
        },
    },
    
    times: {
        type: Number,
        default: 0
    }
});

// Export the Mongoose model
module.exports = mongoose.model('Goal', GoalSchema);
module.exports.schema = GoalSchema;