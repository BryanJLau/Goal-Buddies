var express = require('express');
var router = express.Router();
var middle = require('./commonMiddleware');

/* GET home page. */
router.get('/', middle.checkToken, function (req, res, next) {
    // Pull this out to ensure rendering happens after
    //var renderIndex = function (statsObject) {
        res.render('index', {
            title : 'Goal Buddies',
            //totalGoals : statsObject.totalGoals,
            //goalsCompleted : statsObject.goalsCompleted,
            //daysSaved : statsObject.daysSaved,
            //timesMotivated : statsObject.timesMotivated,
            user: req.user
        });
    //}
    
    //db.getGlobalStatistics(renderIndex);
});

/* GET about page. */
router.get('/about', middle.checkToken, function (req, res, next) {
    res.render('about', { user: req.user });
});

/* GET home page. */
router.get('/home', middle.checkToken, function (req, res, next) {
    res.render('home/index', { title: 'Express', user: req.user });
});

/* GET search page. */
router.post('/search', middle.checkToken, function (req, res, next) {
    var renderSearch = function (username, goals) {
        console.log(username);
        res.render('search', {
            username : username,
            goals : goals,
            user : req.user
        });
    }
    
    if (!req.session.user)
        res.redirect("/user/logout");
    else {
        var term = req.body.term;
        
        db.searchTerm(req.user.id, term, renderSearch);
    }
});

module.exports = router;
