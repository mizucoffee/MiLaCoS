'use strict'

const express = require('express'),
  session = require('express-session'),
  config = require('config'),
  db = require('mongoose'),
  bodyParser = require('body-parser'),
  app = express(),
  http = require('http'),
  https = require('https'),
  fs = require('fs'),
  io = require('socket.io')(http),
  MongoStore = require('connect-mongo')(session),
  Schema = db.Schema

db.connect(`mongodb://${config.get('server.mongo')}/`)

var UserSchema = new db.Schema({
    id: {type: String, required: true},
    password: {type: String, requird: true}
});
var User = db.model("User", UserSchema);

const passport = require('./passport')(User,db)
const sessionMiddleware = session({
  store: new MongoStore({
    db: 'session',
    host: config.get('server.mongo'),
    port: '27017',
    url: `mongodb://${config.get('server.mongo')}/twiback`
  }),
  secret: 'milacos',
  resave: false,
  saveUninitialized: false
})

io.use((socket,next) => sessionMiddleware(socket.request,socket.request.res,next))

app.disable('x-powered-by')
app.use(sessionMiddleware)
app.use(bodyParser.urlencoded({ limit:'100mb',extended: true }))
app.use(bodyParser.json({limit:'100mb'}))
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static('./public'))
app.set('view engine', 'ejs');

io.on('connection',async socket => {
  console.log('connected')
})

var options = {
  cert: fs.readFileSync('./cert/fullchain.pem'),
  key:  fs.readFileSync('./cert/privkey.pem')
};

var server = https.createServer(options,app);
server.listen(config.get('server.https_port'), () => console.log("Node.js is listening to PORT:" + server.address().port));

app.get('/', (req, res) => {
  res.render('pages/index');
});

app.get('/main', (req, res) => {
  res.render('pages/main');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/main');
});
