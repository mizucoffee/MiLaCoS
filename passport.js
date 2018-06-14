const config = require('config'),
  passport = require('passport'),
  TwiStr = require('passport-twitter').Strategy,
  ObjectID = require('mongoose').Types.ObjectId,
  twitter = require('twitter')


module.exports = (User,db) => {

  passport.use(
    new TwiStr({
      consumerKey: config.get('api-keys.twitter.ck'),
      consumerSecret: config.get('api-keys.twitter.cs'),
      callbackURL: `http://${config.get('server.domain')}:${config.get('server.port')}/auth/twitter/callback`
    },
      (token, tokenSec, profile, done) => {
        profile.token = token;
        profile.tokenSecret= tokenSec
        done(null,profile)
      })
  )

  passport.serializeUser((user,done) => {
    var u = new User({
      id: user._json.id_str,
      token: user.token,
      tokenSecret: user.tokenSecret,
      backup_now_following: false,
      backedup_following: null,
      following: []
    })
    u.save((err,res) => {
      if (err) { console.log(err); }
      done(null, res.id);
    });
    // DBにデータを入れ、そのセッションIDをdoneする
  })

  passport.deserializeUser(async (id,done) => {
    // シリアライズで入れたセッションのIDが入る
    // DBからIDを基に取得
    const res = await (new Promise((resolve,reject) => {
      User.findOne({ id: id }, (err,result) => {
        if(err) reject(err);
        resolve(result)
      });
    })).catch((e) => done(e))
    res.client = new twitter({
      consumer_key: config.get('api-keys.twitter.ck'),
      consumer_secret: config.get('api-keys.twitter.cs'),
      access_token_key: res.token,
      access_token_secret: res.tokenSecret,
    });
    done(null,res)
  })

  return passport
}

