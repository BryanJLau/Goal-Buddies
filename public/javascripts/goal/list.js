$(document).ready(function () {
    $(".nav-pills li").click(function () {
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
            401: displayErrorMessage,
            200: function (data, textStatus, jqXHR) {
                // Created (token)
                sessionStorage.setItem("token", data.token);
                sessionStorage.setItem("username", data.user.username);
                sessionStorage.setItem("tokenExpiry", data.expires);
                window.location.replace("/");
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

var goalListApp = angular.module('goalListApp', []);

goalListApp.controller('GoalListCtrl', function ($scope, $http) {
    $scope.goals = [];
    $scope.version = 0;     // Start by getting all goals
    $scope.now = new Date().getTime();
    $scope.goalTypeString = "Recurring";
    $scope.goalType = 0; // Recurring : 0, One-Time : 1
    $scope.totalGoals = 0;
    $scope.finished = false;

    $scope.init = function () {
        $scope.addForm = {};
        $scope.updateList();
    }

    // Set the token in the http request
    var httpConfig = {
        headers: {
            'Content-type': 'application/json',
            'x-access-token': sessionStorage.getItem("token")
        }
    };
    
    $scope.setRecurring = function () {
        $scope.goalTypeString = "Recurring";
        $scope.goalType = 0;
        $scope.finished = false;
    };

    $scope.setOneTime = function () {
        $scope.goalTypeString = "One-Time";
        $scope.goalType = 1;
        $scope.finished = false;
    };

    $scope.showAddGoalModal = function () {
        $("#addGoalModal").modal('show');
    };

    $scope.updateList = function () {
        if (sessionStorage.getItem("token")) {
            $http.get('/api/goals/list', httpConfig)
            .success(function (response) {
                $scope.goals = response.goals;
                $scope.totalGoals = response.totalGoals;
                for (var i = 0; i < $scope.goals.length; i++) {
                    $scope.goals[i].etaMs = new Date($scope.goals[i].eta).getTime();
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
        console.log(addData);

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
});