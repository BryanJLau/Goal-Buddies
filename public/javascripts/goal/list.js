var Goal = Backbone.Model.extend({
    defaults: {
        id: -1,
        userId: -1,
        description: "",
        type: -1,
        icon: -1,
        eta: -1,
        timesFinished: -1,
        timesMotivated: -1
    },
    idAttribute: "id",
    initialize: function () {
        this.on("invalid", function (model, error) {
            console.log("Problem initializing goal " + this.idAttribute +
                ": " + error);
        });

        // Lets hook up some event handers to listen to model change
        this.on('change:timesFinished', function () {
            console.log('Message from specific listener: BookName has been changed');
        });
    },
    constructor: function (attributes, options) {
        Backbone.Model.apply(this, arguments);
    },
    validate: function (attr) {
        // All fields should be populated with nonempty and nonnegatve values
        if (!attr.id || attr.id < 0) {
            return "Invalid id.";
        }
        else if (!attr.userId || attr.userId < 0) {
            return "Invalid userId.";
        }
        else if (!attr.description || attr.description == "") {
            return "Invalid description.";
        }
        else if (!attr.type || attr.type < 0) {
            return "Invalid type.";
        }
        else if (!attr.icon || attr.icon < 0) {
            return "Invalid icon.";
        }
        else if (!attr.eta || attr.eta < 0) {
            return "Invalid eta.";
        }
        else if (!attr.timesFinished || attr.timesFinished < 0) {
            return "Invalid timesFinished.";
        }
        else if (!attr.timesMotivated || attr.timesMotivated < 0) {
            return "Invalid timesMotivated.";
        }
    },
    urlRoot: '/goal/view',

    // Custom functions for goals
    finish: function () {
        this.set("timesFinished", this.get("timesFinished") + 1);
    },
    motivate: function () {
        this.set("timesMotivated", this.get("timesMotivated") + 1);
    },
    edit: function (newDescription) {
        this.set("description", newDescription + 1);
    },

    syncFinish: function (opts) {
        var options = {
            url: '/goal/' + this.get("id") + '/finish',
            type: 'POST',
            data: { 'token': token }
        };

        // add any additional options, e.g. a "success" callback or data
        _.extend(options, opts);

        return (this.sync || Backbone.sync).call(this, null, this, options);
    }
});

// For some reason, collections don't have .add()? 
var GoalCollection = [];

$(document).ready(function () {
    $.ajax({
        type: 'POST',
        url: '/goal/list/',
        data: { token: token },
        success: function (data) {
            for (var i = 0; i < data.goalList.length; i++) {
                GoalCollection.push(new Goal(data.goalList[i]));
                var goalId = data.goalList[i].id;
                var description = data.goalList[i].description;
            }
        }
    });
});