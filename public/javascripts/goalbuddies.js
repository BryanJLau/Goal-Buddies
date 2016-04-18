// Redirect immediately if necessary
(function () {
    if (sessionStorage.getItem("tokenExpiry") !== null) {
        if (sessionStorage.getItem("tokenExpiry") < new Date().getTime()) {
            // Token expired, delete everything and redirect to the login
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("username");
            sessionStorage.removeItem("tokenExpiry");
            window.location.replace("/users/login");
        }
    }
    if (!(window.location.pathname == "/" || window.location.pathname == "/users/login" ||
        window.location.pathname == "/users/register") && sessionStorage.getItem("token") == null) {
        // Should have a token in all places excluding these three
        window.location.replace("/users/login");
    }

    if((window.location.pathname == "/users/login" || window.location.pathname == "/users/register") &&
        sessionStorage.getItem("token") != null) {
        // Already logged in
        window.location.replace("/goals");
    }
})();

// To populate the header
$(document).ready(function () {
    if (sessionStorage.getItem("username") != null) {
        $('#goalLinks').html(
            '<li class="dropdown"><a class="dropdown-toggle" data-toggle="dropdown" href="#">' +
                '<li><a href="/goals/new">Add a goal!</a></li>' +
            '<li><a href="/about">About</a></li>'
        );

        $('#userLinks').html(
            '<form class="navbar-form navbar-left" role="search" action="/search" method="POST">' +
                '<div class="form-group">' +
                    '<input type="text" name="q" class="form-control" placeholder="Search">' +
					'<input type="hidden" name="token" value=' + 
					sessionStorage.getItem("token") + '>' +
                '</div>' +
                '<button type="submit" class="btn btn-default"><span class="glyphicon glyphicon-search" /></button>' +
            '</form>' +
            '<li><a href="/users/account"><span class="glyphicon glyphicon-user"></span> ' +
                sessionStorage.getItem("username") +
            '</a></li>' +
            '<li><a id="logoutLink" href="/"><span class="glyphicon glyphicon-log-in"></span> Logout</a></li>'
        );
    }
    else {
        $('#userLinks').html(
            '<li><a href="/users/register"><span class="glyphicon glyphicon-user"></span> Register</a></li>' +
            '<li><a href="/users/login"><span class="glyphicon glyphicon-log-in"></span> Login</a></li>'
        );
    }

    // Delete the sessionStorage token and username to simulate a logout
    $('#logoutLink').click(function () {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("tokenExpiry");
        return true;
    });
});

// To set the header to contain the token on every API request
var token = window.sessionStorage.getItem('token');
if (token) {
    $.ajaxSetup({
        headers: {
            'x-access-token': token
        }
    });
}