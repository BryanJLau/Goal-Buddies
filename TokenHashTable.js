var crypto = require('crypto');     // Used for creating tokens

// This is a rudimentary hash table for the access tokens with TTL
// This is a singleton so that there aren't multiple versions floating around
var TokenHashTable = (function () {
    var instance;   // Singleton
    
    function init() {
        // Private
        // This object will be our associative "array"
        var hashTable = {};
        var date = new Date();
        
        return {
            // Public
            
            // Get the singleton instance (has to be duplicated below?)
            getInstance : function () {
                if (!instance) {
                    instance = init();
                }
                return instance;
            },

            // Prunes the table of entries that have expired TTL
            pruneTable : function () {
                var msNow = date.getTime();
                
                // Delete all the tokens that have expired
                // Because hashTable isn't an array, have to use foreach loop
                //   (length isn't affected because not an array)
                for (var hashKey in hashTable) {
                    if (msNow > hashTable[hashKey].ttl) {
                        console.log("Deleted expired token: " + hashKey);
                        delete hashTable[hashKey];
                    }
                }
            },  // End pruneTable
            
            // Delete a token (on logout)
            deleteToken : function (token) {
                if (hashTable.hasOwnProperty(token)) {
                    console.log("Deleted token: " + token);
                    delete hashTable[token];
                }
            },
            
            // Takes the user ID, returns the newly created hash
            createNewHash : function (key) {
                var hash = crypto.createHash('md5');
                // Ensure unique key 
                var msNow = date.getTime();
                var randomNumber = Math.random() * 100000;  // Random value to ensure uniqueness
                hash.update(msNow.toString() + randomNumber.toString() + key.toString());
                var hashString = hash.digest('hex') + '';   // Ensure it's a string
                
                // The entry needs ID (obviously) and a 
                hashTable[hashString] = {
                    id : key,
                    ttl : msNow + 86400000    // + 1 day
                }
                
                console.log("Creating token " + hashString + " for user ID " + key);

                return hashString;
            },   // End createNewHash
            
            // Get the id associated with a particular token
            getId : function (hash) {
                // Code written like this for clarity
                if (hashTable.hasOwnProperty(hash))
                    return hashTable[hash].id;
                else
                    return -1;
            }   // End getId

        };
    }   // End init
    
    // Return for the anonymous function (singleton)
    return {
        // Get the singleton instance
        getInstance : function () {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    };

})();  // IIFE

module.exports = TokenHashTable.getInstance();