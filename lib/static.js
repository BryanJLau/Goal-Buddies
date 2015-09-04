var staticVariables = (function () {
    // Private
    var goalTypes = {
        recurring: function () { return 0; },
        oneTime: function () { return 1; }
    }
    
    return {
        // Public
        
        goalTypes : {
            recurring : goalTypes.recurring,
            oneTime: goalTypes.oneTime
        }
    }
})();

module.exports = staticVariables;