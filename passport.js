const config = require('config'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  mongoose = require('mongoose')
  ObjectID = mongoose.Types.ObjectId

module.exports = (User,db) => {

  passport.use(
    new LocalStrategy(
      {usernameField: "id", passwordField: "password"},
      (id, password, done) => {
        if (id === "mzcf") return done(null, id);
        return done(null, false)
      }
    )
  );

  passport.serializeUser(function(user, cb) {
    cb(null, {id: user.email, _id: user._id});
  });

  passport.deserializeUser(function(user, cb) {
    User.findById(user._id, function(err, u){
      cb(err, u);
    });
  });


  return passport
}

