$(document).ready(function () {
    $.validator.addMethod("normalRegex", function (value, element) {
        return this.optional(element) || /^[a-z0-9\-\s.,!?\'\"]+$/i.test(value);
    }, "Body must contain only letters, numbers, or normal punctuation.");

    // validate signup form on keyup and submit
    $("#newGoalForm").validate({
        rules: {
            body: {
                required: true,
                normalRegex: true
            },
            daysToFinish: {
                required: true,
                number: true
            },
            icon: {
                required: true,
                number: true
            }
        },
        highlight: function (element) {
            $(element).closest('.form-group').removeClass('has-success').addClass('has-error');
            // Change the glyphicon to X
            var id_attr = "#" + $(element).attr("id") + "g";
            $(id_attr).removeClass('glyphicon-ok').addClass('glyphicon-remove');
        },
        unhighlight: function (element) {
            $(element).closest('.form-group').removeClass('has-error').addClass('has-success');
            // Change the glyphicon to V
            var id_attr = "#" + $(element).attr("id") + "g";
            $(id_attr).removeClass('glyphicon-remove').addClass('glyphicon-ok');
        },
        errorElement: 'span',
        errorClass: 'help-block',
        errorPlacement: function (error, element) {
            if (element.length) {
                error.insertAfter(element);
            } else {
                error.insertAfter(element);
            }
        },
        messages: {
            body: {
                required: "Please enter a goal!",
                normalRegex: "Please enter only alphanumeric characters."
            },
            eta: {
                required: "Please enter how long you expect to take on this goal.",
                number: "Please input numbers only."
            },
            icon: {
                required: "Please enter a placeholder icon value.",
                number: "Please input numbers only."
            }
        },
        success: function (element) {
            element.closest('.form-group').removeClass('has-error').addClass('has-success');

        }
    });

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
    $('#newGoalForm').ajaxForm(options);
});

var displayErrorMessage = function (data, textStatus, jqXHR) {
    var result = JSON.parse(data.responseText);
    $('#errorMessage').text(result.error);
    $('#errorDiv').removeClass('hidden');
}

// Form handler
$('#newGoalForm').submit(function () {
    $(this).ajaxSubmit();

    // Prevent browser navigation
    return false;
});