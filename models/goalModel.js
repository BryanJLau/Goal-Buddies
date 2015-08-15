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
        default : true
    },
    unread: {
        type : Boolean,
        default : false
    },
    created: {
        type : Date,
        default : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime()
    },
    eta: {
        type : Date,
        required: [
            true,
            "The field '{PATH}' is required."
        ],
        default : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime() + 86400000
    },
    finished: {
        type : Date,
        default : null
    },
    times: {
        type: Number,
        default: 0
    },
    version: {
        type: Number,
        default: 1
    }
});

// Export the Mongoose model
module.exports = mongoose.model('Goal', GoalSchema);
module.exports.schema = GoalSchema;