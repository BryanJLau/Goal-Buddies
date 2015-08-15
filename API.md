All requests will return a JSONObject, with the specified properties.

An error will contain a JSONObject with:

* ``` statusCode ``` : The appropriate status code of the error
* ``` devError ``` : An error message describing the error for developers
* ``` error ``` : An error message to be presented to the end user

Note: statusCode BAD_REQUEST (400) will be returned if some fields are missing.

API Addresses
=============
The locations for the API can be found at:

``` http://api.domain.com/ ```

OR

``` http://www.domain.com/api/ ```

Token Usage
=============
Tokens are JSON web tokens. As such, they can appear in any of the following 
three places:

* ``` sessionStorage ``` : When using the Goal Buddies website, the token will be
stored here.
* ``` parameter ``` : The entire token can be present in the URL if necessary, 
eg. ``` http://www.domain.com/api/users?token=<token> ```, substituting <token> 
for the actual token for GET requests, or an ordinary parameter in POST requests.
* ``` HTTP header ``` : In the field "x-access-token" with the value being the token.

Tokens have the format:

* ``` token ``` : The actual text of the token
* ``` username ``` : Your username
* ``` expires ``` : Datetime (in ms) of when your token expires

Tokens have (by default) a 1 day lifespan.

User
=============
Get access token
-------------
``` POST /users/login ```

Parameters:

* ``` username ``` : Your username
* ``` password ``` : Your password

Returns:

* ``` statusCode ``` : Created (201) if successful, Unauthorized (401) on failure
* ``` token ``` : A unique token (application specific) required for other functions
* ``` user ``` : A JSONObject containing your username and id (more information may 
be added if necessary)

Register a user
-------------
``` POST /users ```

Parameters:

* ``` username ``` : Your username
* ``` password ``` : Your password
* ``` firstname ``` : Your first name
* ``` lastname ``` : Your last name
* ``` city ``` : Your current city of residence

Returns:

* ``` statusCode ``` : Created (201) if successful, Conflict (409) on failure
* ``` token ``` : A unique token (application specific) required for other functions
* ``` user ``` : A JSONObject containing your username (more information may 
be added if necessary)

Note: the personal information is only used for visibility purposes, by no means do 
you have to input real information if you are not comfortable doing so. Friends will 
be able to search for you through username or (full name + city).

View a user's profile
-------------
``` GET /users/:username ```

Parameters:

* ``` token ``` : Your personal access token
* ``` username ``` : The user's username who you want to see

Returns:

* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` foreignUser ``` : A JSONObject containing the requested user's public information

Goal
=============
Get a user's list of goals
-------------
``` GET /goals/list ```

Parameters:

* ``` token ``` : Your personal access token
* ``` username ``` : (OPTIONAL) The requested user's username
* ``` version ``` : Get all goals with version > this parameter
* ``` offset ``` : Output goals starting at offset (default: 0)
* ``` limit ``` : Return up to this many goals (default: 10)
* ``` type ``` : The type of goals (recurring: 0, one-time: 1, default: 0)
* ``` finished ``` : True to return finished goals (default: false)

Returns:

* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` goals ``` : A JSONArray with goals
* ``` totalGoals ``` : The total number of goals the user has (for pagination)

To get your own goals, do not provide a username.

Get a goal
-------------
``` POST /goals/list/:username ```

Parameters:

* ``` token ``` : Your personal access token
* ``` username ``` : The desired person's username (if yourself, leave blank)

Returns:

* ``` statusCode ``` : OK (200) if successful, Unauthorized (401)
or Not Found (404) on failure
* ``` goals ``` : An array (NOT AN OBJECT) 

Add a goal
-------------
``` POST /goals ```

Parameters:

* ``` token ``` : Your personal access token
* ``` description ``` : Your description of the goal
* ``` type ``` : The type of goal (recurring: 0, one-time: 1)
* ``` icon ``` : A string corresponding to a glyphicon
* ``` daysToFinish ``` : Projected number of days to completion

Returns:

* ``` statusCode ``` : Created (201) if successful, Unauthorized (401)
or Not Found (404) on failure
* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` goal ``` : A JSONObject representing your new goal details

Update a goal's description
-------------
``` POST /goals/:id/edit ```

Parameters:

* ``` token ``` : Your personal access token
* ``` description ``` : Your new description of the goal

Returns:

* ``` statusCode ``` : OK (200) if successful, Unauthorized (401)
or Not Found (404) on failure
* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` goal ``` : A JSONObject representing your new goal

Finish a goal
-------------
``` POST /goals/:id/finish ```

Parameters:

* ``` token ``` : Your personal access token

Returns:

* ``` statusCode ``` : OK (200) if successful, Unauthorized (401)
or Not Found (404) on failure
* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` goal ``` : A JSONObject representing your new goal

Motivate a goal
-------------
``` POST /goals/:id/motivate ```

Parameters:

* ``` token ``` : Your personal access token

Returns:

* ``` statusCode ``` : OK (200) if successful, Unauthorized (401)
or Not Found (404) on failure
* ``` error ``` : An error message in case of incorrect credentials or server errors

Delete a goal
-------------
``` DELETE /goals/:id ```

Parameters:

* ``` token ``` : Your personal access token

Returns:

* ``` statusCode ``` : No Content (204) if successful, Unauthorized (401)
or Not Found (404) on failure
* ``` error ``` : An error message in case of incorrect credentials or server errors


Warning / Disclaimer
=============
This API will change, so make sure applications using this are flexible.