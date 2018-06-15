const config = require('config'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  mongoose = require('mongoose'),
  crypto = require('crypto'),
  ObjectID = mongoose.Types.ObjectId

module.exports = (User,db) => {

  passport.use(
    new LocalStrategy(
      {usernameField: "id", passwordField: "password"},
      (id, password, done) => {
        const sha512 = crypto.createHash('sha512')
        sha512.update(password)
        User.findOne({id: id, password: sha512.digest('hex')}, (err,result) => {
          return done(err, result);
        })
      }
    )
  );

  passport.serializeUser(function(user, cb) {
    cb(null, user._id);
  });

  passport.deserializeUser(function(id, cb) {
    //ここでIDを用いてDBに登録されてる情報を参照しコールバックに投げる
    User.findById(id, function(err, u){
      cb(err, u);
    });
  });


  return passport
}

