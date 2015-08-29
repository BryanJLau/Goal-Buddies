$(document).ready(function () {
    // Nav active pills
    $(".nav-pills > .enabled").click(function () {
        $(".active").removeClass("active");
        $(this).addClass("active");
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
            401: function () {
                // Unauthorized!
                window.location.replace("/users/login");
            },
            500: displayErrorMessage,
            201: function (data, textStatus, jqXHR) {
                // Created the goal!
                // Refresh the view
                angular.element(document.getElementById('mainBody')).scope().updateList();
                angular.element(document.getElementById('mainBody')).scope().$apply();
            }
        }
    }

    // Add goal form validation
    $("#addGoalForm").validate({
        rules: {
            body: {
                required: true
            },
            eta: {
                required: true,
                number: true
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
            body: {
                required: "Please enter a goal!"
            },
            eta: {
                required: "Please enter how long you expect to take on this goal.",
                number: "Please input numbers only."
            }
        },
        success: function(element) {
            element.closest('.form-group').removeClass('has-error').addClass('has-success');
        }
    });

    // Bind to the add goal form for AJAX functionality
    $('#addGoalForm').ajaxForm(options);
});

var displayErrorMessage = function (data, textStatus, jqXHR) {
    var result = JSON.parse(data.responseText);
    $('#errorMessage').text(result.error);
    $('#errorDiv').removeClass('hidden');
}

// Form handler
$('#addGoalForm').submit(function () {
    $(this).ajaxSubmit();

    // Prevent browser navigation
    return false;
});

var goalListApp = angular.module('goalListApp', []);

goalListApp.controller('GoalListCtrl', function ($scope, $http) {
    var d = new Date();
    $scope.goals = [];
    $scope.version = 0;     // Start by getting all goals
    $scope.now = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
        0, 0, 0, 0).getTime();
    $scope.goalTypeString = "Recurring";
    $scope.goalType = 0; // Recurring : 0, One-Time : 1
    $scope.totalGoals = 0;
    $scope.pending = true;
    $scope.editDescription = "";    // Used for editting goals

    $scope.init = function () {
        $scope.addForm = {};
        $scope.updateList();
    }

    // Set the token in the http request
    var httpConfig = {
        headers: {
            'Content-type': 'application/json',
            'x-access-token': sessionStorage.getItem("token")
        },
        params: {
            pending: $scope.pending     // Initially
        }
    };

    $scope.panelClass = function (goal) {
        if (goal.pending) {
            if (goal.etaMs <= $scope.now) return 'panel-danger';
            else if (goal.unread) return 'panel-warning';
            else if (goal.finishedMs >= $scope.now) return 'panel-success';
        }
        else return 'panel-success';
    }

    $scope.setRecurring = function () {
        $scope.goalTypeString = "Recurring";
        $scope.goalType = 0;
        $scope.pending = true;
        httpConfig.params.pending = $scope.pending;
        httpConfig.params.type = $scope.goalType;
        $scope.updateList();
    };

    $scope.setOneTime = function () {
        $scope.goalTypeString = "One-Time";
        $scope.goalType = 1;
        $scope.pending = true;
        httpConfig.params.pending = $scope.pending;
        httpConfig.params.type = $scope.goalType;
        $scope.updateList();
    };

    $scope.setFinishedRecurring = function () {
        $scope.goalTypeString = "Finished Recurring";
        $scope.goalType = 0;
        $scope.pending = false;
        httpConfig.params.pending = $scope.pending;
        httpConfig.params.type = $scope.goalType;
        $scope.updateList();
    };

    $scope.setFinishedOneTime = function () {
        $scope.goalTypeString = "Finished One-Time";
        $scope.goalType = 1;
        $scope.pending = false;
        httpConfig.params.pending = $scope.pending;
        httpConfig.params.type = $scope.goalType;
        $scope.updateList();
    };

    $scope.updateList = function () {
        if (sessionStorage.getItem("token")) {
            $http.get('/api/goals/list', httpConfig)
            .success(function (response) {
                $scope.goals = response.goals;
                $scope.totalGoals = response.totalGoals;
                for (var i = 0; i < $scope.goals.length; i++) {
                    $scope.goals[i].etaMs = new Date($scope.goals[i].eta).getTime();
                    $scope.goals[i].finishedMs = new Date($scope.goals[i].finished).getTime();
                }
            }).error(function (error) {
                alert("Something went wrong, try refreshing the page.");
            });
        }
    };

    $scope.addGoal = function () {
        $('#loaderGif').removeClass('hidden');
        $('#errorDiv').addClass('hidden');

        var addData = {
            token: sessionStorage.getItem("token"),
            description: $scope.addForm.description,
            icon: $("#addGoalIconSelect").val(),
            daysToFinish: $scope.addForm.daysToFinish,
            type: $scope.addForm.type
        };

        $http.post('/api/goals', addData)
        .then(function (response) {
            // Return everything to normal
            $('#loaderGif').addClass('hidden');
            console.log(response);
            $('#addGoalModal').modal('hide');
            $scope.updateList();

            $scope.addGoalForm.$setPristine();

            // Reset the form
            $scope.addForm.description = "";
            $scope.addForm.daysToFinish = "";
            $('.selectpicker').selectpicker('val', 'star');
            $scope.addForm.type = 0;
        }, function (error) {
            $('#loaderGif').addClass('hidden');
            $('#errorMessage').text(error.data.error);
            $('#errorDiv').removeClass('hidden');
        });
    };

    $scope.finishGoal = function (id) {
        var finishData = {
            token: sessionStorage.getItem("token"),
        };

        // Need to delay updateList or else backdrop persists from modal
        setTimeout(function () {
            $http.post('/api/goals/' + id + '/finish', finishData)
            .then(function (response) {
                $scope.updateList();
            }, function (error) {
                $('#errorModal').modal('show');
            });
        }, 1000);
    }

    $scope.editGoal = function (id, newDescription) {
        var editData = {
            token: sessionStorage.getItem("token"),
            description: newDescription
        };
        $('#me' + id).modal('hide');

        // Need to delay updateList or else backdrop persists from modal
        setTimeout(function () {
            $http.post('/api/goals/' + id + '/edit', editData)
            .then(function (response) {
                $scope.updateList();
                $("#edescription").val("");
            }, function (error) {
                $('#errorModal').modal('show');
            });
        }, 1000);
    }

    $scope.deleteGoal = function (id) {
        var deleteData = {
            token: sessionStorage.getItem("token")
        };
        $('#md' + id).modal('hide');

        // Need to delay updateList or else backdrop persists from modal
        setTimeout(function () {
            $http.post('/api/goals/' + id + '/delete', deleteData)
            .then(function (response) {
                $scope.updateList();
            }, function (error) {
                $('#errorModal').modal('show');
            });
        }, 1000);
    }
});