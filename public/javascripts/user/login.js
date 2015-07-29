$(document).ready(function () {
    var options = {
        beforeSubmit: function () {
            $('#loaderGif').removeClass('hidden');
            $('#errorMessage').addClass('hidden');
            return true;
        },
        complete: function () {
            $('#loaderGif').addClass('hidden');
        },
        statusCode: {
            401: function () {
                // Unauthorized
                $('#errorMessage').removeClass('hidden');
            },
            201: function () {
                // Created (token)
                window.location.replace("/");
            }
        }
    }

    // Bind to the login form for AJAX functionality
    $('#loginForm').ajaxForm(options);
});

// Form handler
$('#loginForm').submit(function () {
    $(this).ajaxSubmit();

    // Prevent browser navigation
    return false;
});