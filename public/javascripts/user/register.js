$(document).ready(function() {
	// validate signup form on keyup and submit
	$("#registerForm").validate({
		rules: {
			firstname: {
			    required: true,
			    lettersonly: true
		    },
			lastname: {
			    required: true,
			    lettersonly: true
		    },
			city: {
			    required: true,
			    lettersonly: true
		    },
			username: {
				required: true,
				minlength: 6,
				alphanumeric: true
			},
			password: {
				required: true,
				minlength: 6,
				alphanumeric: true
			},
			cpassword: {
				required: true,
				minlength: 6,
				alphanumeric: true,
				equalTo: "#password"
			},
			agree: {
			    required: true
		    }
		},
		highlight: function(element) {
            $(element).closest('.form-group').removeClass('has-success').addClass('has-error');
            // Change the glyphicon to X
	        var id_attr = "#" + $( element ).attr("id") + "g";
            $(id_attr).removeClass('glyphicon-ok').addClass('glyphicon-remove');         
        },
        unhighlight: function(element) {
            $(element).closest('.form-group').removeClass('has-error').addClass('has-success');
            // Change the glyphicon to V
            var id_attr = "#" + $( element ).attr("id") + "g";
            $(id_attr).removeClass('glyphicon-remove').addClass('glyphicon-ok');         
        },
        errorElement: 'span',
        errorClass: 'help-block',
        errorPlacement: function(error, element) {
            if(element.length) {
                error.insertAfter(element);
            } else {
                error.insertAfter(element);
            }
        },
		messages: {
			firstname: {
			    required: "Please enter your first name.",
			    lettersonly: "Please input letters only."
		    },
			lastname: {
			    required: "Please enter your last name.",
			    lettersonly: "Please input letters only."
		    },
			city: {
			    required: "Please enter your city.",
			    lettersonly: "Please input letters only."
		    },
			username: {
				required: "Please enter a username.",
				minlength: "Please enter at least 6 characters.",
				alphanumeric: "Please enter only alphanumeric characters.",
			},
			password: {
				required: "Please provide a password.",
				minlength: "Please enter at least 6 characters.",
				alphanumeric: "Please enter only alphanumeric characters."
			},
			cpassword: {
				required: "Please provide a password.",
				minlength: "Please enter at least 6 characters.",
				equalTo: "<Please enter the same password as above.",
				alphanumeric: "Please enter only alphanumeric characters."
			},
			agree: "Please accept our policy"
		},
		success: function(element) {
            element.closest('.form-group').removeClass('has-error').addClass('has-success');
        }
	});

    // Ajax submit
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
	        409: displayErrorMessage,
	        201: function () {
	            // Created user
	            window.location.replace("/goal");
	        }
	    }
	}

    // Bind to the register form for AJAX functionality
	$('#registerForm').ajaxForm(options);
});

var displayErrorMessage = function (data, textStatus, jqXHR) {
    var result = JSON.parse(data.responseText);
    $('#errorMessage').text(result.error);
    $('#errorDiv').removeClass('hidden');
}

// Form handler
$('#registerForm').submit(function () {
    $(this).ajaxSubmit();

    // Prevent browser navigation
    return false;
});