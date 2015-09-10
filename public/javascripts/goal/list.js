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
                angular.element(document.getElementById('mainBody'))
                    .scope().updateList();
                angular.element(document.getElementById('mainBody'))
                    .scope().$apply();
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
            $(element).closest('.form-group')
                .removeClass('has-success').addClass('has-error');
            // Change the glyphicon to X
            var id_attr = "#" + $( element ).attr("id") + "g";
            $(id_attr).removeClass('glyphicon-ok')
                .addClass('glyphicon-remove');
        },
        unhighlight: function(element) {
            $(element).closest('.form-group')
                .removeClass('has-error').addClass('has-success');
            // Change the glyphicon to V
            var id_attr = "#" + $( element ).attr("id") + "g";
            $(id_attr).removeClass('glyphicon-remove')
                .addClass('glyphicon-ok');
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
                required: "Please enter how long you expect to take on " +
                    "this goal.",
                number: "Please input numbers only."
            }
        },
        success: function(element) {
            element.closest('.form-group')
                .removeClass('has-error').addClass('has-success');
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

goalListApp.controller('GoalListCtrl', function ($scope, $http, $timeout) {
    var d = new Date();
    var postData = {
        token: sessionStorage.getItem("token")
    }

    // Get today's date's 12 AM to compare with goal dates
    $scope.now = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
        0, 0, 0, 0).getTime();

    $scope.editDescription = "";    // Used for editting goals

    $scope.init = function () {
        $scope.list = {
            type: 0,
            pending: true,
            searchQuery: ""
        };
        $scope.addForm = {};

        $scope.updateList();
    }

    var searchUpdateTimer = false;
    $scope.$watch('list.searchQuery', function () {
        if (searchUpdateTimer) {
            // Ignore this change
            $timeout.cancel(searchUpdateTimer)
        }
        searchUpdateTimer = $timeout(function () {
            $scope.updateList();
        }, 500)
    });

    // Set the panel class according to the status of the goal
    $scope.panelClass = function (goal) {
        if (goal.pending) {
            if (goal.etaMs <= $scope.now) return 'panel-danger';
            else if (goal.unread) return 'panel-warning';
            else if (goal.finishedMs >= $scope.now) return 'panel-success';
        }
        else return 'panel-success';
    }

    // When the nav is changed
    $scope.changeTypes = function (type, pending) {
        if (pending)
            $scope.goalTypeString = "";
        else
            $scope.goalTypeString = "Finished ";

        if (type == 0)
            $scope.goalTypeString += "Recurring";
        else
            $scope.goalTypeString += "One-Time";

        $scope.list.pending = pending;
        $scope.list.type = type;

        $scope.updateList();
    }

    $scope.updateList = function () {
        // Set the token in the get request
        var getConfig = {
            headers: {
                'Content-type': 'application/json',
                'x-access-token': sessionStorage.getItem("token")
            },
            params: {}
        };

        // Initial setup
        console.log($scope.list);
        getConfig.params.pending = $scope.list.pending;
        getConfig.params.type = $scope.list.type;
        getConfig.params.q = $scope.list.searchQuery;

        $('#listLoaderGif').removeClass('hidden');

        // Actually send POST request
        if (sessionStorage.getItem("token")) {
            $http.get('/api/goals/list', getConfig)
                .success(function (response) {
                    $scope.goals = response.goals;
                    $scope.totalGoals = response.totalGoals;
                    for (var i = 0; i < $scope.goals.length; i++) {
                        // Date manipulation for prettier printing
                        $scope.goals[i].createdDate =
                            new Date($scope.goals[i].created).toDateString();
                        $scope.goals[i].etaMs =
                            new Date($scope.goals[i].eta).getTime();
                        $scope.goals[i].finishedMs =
                            new Date($scope.goals[i].finished).getTime();
                        $scope.goals[i].etaDate =
                            new Date($scope.goals[i].eta).toDateString();
                        $scope.goals[i].finishedDate =
                            new Date($scope.goals[i].finished).toDateString();
                    }
                    $('#listLoaderGif').addClass('hidden');
                })
                .error(function (error) {
                    $('#errorModal').modal('show');
                    $('#listLoaderGif').addClass('hidden');
                });
        }
    };

    $scope.addGoal = function () {
        $('#addLoaderGif').removeClass('hidden');
        $('#addErrorDiv').addClass('hidden');

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
                $('#addLoaderGif').addClass('hidden');
                console.log(response);
                $('#addGoalModal').modal('hide');
                $scope.updateList();

                $scope.addGoalForm.$setPristine();

                // Reset the form
                $scope.addForm.description = "";
                $scope.addForm.daysToFinish = "";
                $('.selectpicker').selectpicker('val', 'star');
                $scope.addForm.type = 0;
            },
            function (error) {
                $('#addLoaderGif').addClass('hidden');
                $('#errorMessage').text(error.data.error);
                $('#addErrorDiv').removeClass('hidden');
            });
    };

    $scope.finishGoal = function (id) {
        // Need to delay updateList or else backdrop persists from modal
        setTimeout(function () {
            $http.post('/api/goals/' + id + '/finish', postData)
            .then(function (response) {
                $scope.updateList();
            }, function (error) {
                $('#errorModal').modal('show');
            });
        }, 1000);
    }

    // Can't use $scope.editDescription directly, returns undefined always
    $scope.editGoal = function (id, newDescription) {
        // Adding description to the body is harmless for other functions
        postData.description = newDescription;
        $('#me' + id).modal('hide');

        // Need to delay updateList or else backdrop persists from modal
        setTimeout(function () {
            $http.post('/api/goals/' + id + '/edit', postData)
            .then(function (response) {
                $scope.updateList();
                $("#edescription").val("");
            }, function (error) {
                $('#errorModal').modal('show');
            });
        }, 1000);
    }

    $scope.deleteGoal = function (id) {
        $('#md' + id).modal('hide');

        // Need to delay updateList or else backdrop persists from modal
        setTimeout(function () {
            $http.post('/api/goals/' + id + '/delete', postData)
            .then(function (response) {
                $scope.updateList();
            }, function (error) {
                $('#errorModal').modal('show');
            });
        }, 1000);
    }
});