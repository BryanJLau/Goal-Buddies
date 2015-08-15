// Secret for JSON web tokens
exports.tokenSecret = "Greg's secret is not helping me. ):";

// default to a 'localhost' configuration:
var connection_string = 'mongodb://goalbuddies:pwd123@ds038888.mongolab.com:38888/goalbuddies'
    || '127.0.0.1:27017/v2';
// if OPENSHIFT env variables are present, use the available connection info:
if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
    connection_string =
        process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
        process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
        process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
        process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
        process.env.OPENSHIFT_APP_NAME;
}

exports.mongoAddr = connection_string;