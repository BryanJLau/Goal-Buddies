$(document).ready(function () {
    var options = {
        beforeSubmit: function () {
            $('#loaderGif').removeClass('hidden');
            $('#errorDiv').addClass('hidden');
            return true;
        },
        complete: function () {
            $('#loaderGif').addClass('hidden');
        },
        statusCode: {
            400: displayErrorMessage,
            401: displayErrorMessage,
            201: function () {
                // Created (token)
                window.location.replace("/goal");
            }
        }
    }

    // Bind to the login form for AJAX functionality
    $('#loginForm').ajaxForm(options);
});

var displayErrorMessage = function (data, textStatus, jqXHR) {
    var result = JSON.parse(data.responseText);
    $('#errorMessage').text(result.error);
    $('#errorDiv').removeClass('hidden');
}

// Form handler
$('#loginForm').submit(function () {
    $(this).ajaxSubmit();

    // Prevent browser navigation
    return false;
});