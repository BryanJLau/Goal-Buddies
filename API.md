All requests will return a JSONObject, with the specified properties.
statusCode represents the HTTP status code, and is not part of the JSON.

User
=============
Get access token
-------------
``` POST /user/login ```

Parameters:

* ``` username ``` : Your username
* ``` password ``` : Your password

Returns:

* ``` statusCode ``` : Created (201) if successful, Unauthorized (401) on failure
* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` token ``` : A unique token (application specific) required for other functions
* ``` user ``` : A JSONObject representing your user details

Register a user
-------------
``` POST /user ```

Parameters:

* ``` username ``` : Your username
* ``` password ``` : Your password
* ``` firstname ``` : Your first name
* ``` lastname ``` : Your last name
* ``` city ``` : Your current city of residence

Returns:

* ``` statusCode ``` : Created (201) if successful, Conflict (409) on failure
* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` token ``` : A unique token (application specific) required for other functions
* ``` user ``` : A JSONObject representing your new user details

Logout a user
-------------
``` GET /user/logout ```

There are no parameters or return data. The token is deleted automatically.

View a user's profile
-------------
``` GET /user/:username ```

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
``` GET /goal ```

Parameters:

* ``` token ``` : Your personal access token
* ``` username ``` : The requested user's username

Returns:

* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` goals``` : A JSONArray with goals

To get your own goals, use your own access token and username.

Add a goal
-------------
``` POST /goal ```

Parameters:

* ``` token ``` : Your personal access token
* ``` description ``` : Your description of the goal
* ``` type ``` : The type of goal (recurring: 0, one-time: 1)
* ``` daysToFinish ``` : Projected number of days to completion
* ``` city ``` : Your current city of residence

Returns:

* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` token ``` : A unique token (application specific) required for other functions
* ``` user ``` : A JSONObject representing your new user details

Update a goal's description
-------------
``` PUT /goal/:id/edit ```

Parameters:

* ``` token ``` : Your personal access token
* ``` description ``` : Your new description of the goal

Returns:

* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` goal ``` : A JSONObject representing your new goal

Finish a goal
-------------
``` PUT /goal/:id/finish ```

Parameters:

* ``` token ``` : Your personal access token

Returns:

* ``` error ``` : An error message in case of incorrect credentials or server errors
* ``` goal ``` : A JSONObject representing your new goal

Motivate a goal
-------------
``` PUT /goal/:id/motivate ```

Parameters:

* ``` token ``` : Your personal access token

Returns:

* ``` error ``` : An error message in case of incorrect credentials or server errors

Delete a goal
-------------
``` DELETE /goal/:id ```

Parameters:

* ``` token ``` : Your personal access token

Returns:

* ``` error ``` : An error message in case of incorrect credentials or server errors


Warning / Disclaimer
=============
This API will change, so make sure applications using this are flexible.