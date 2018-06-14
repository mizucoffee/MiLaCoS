'use strict'

const express = require('express'),
  session = require('express-session'),
  config = require('config'),
  db = require('mongoose'),
  bodyParser = require('body-parser'),
  app = express(),
  http = require('http').Server(app),
  io = require('socket.io')(http),
  MongoStore = require('connect-mongo')(session),
  Schema = db.Schema

db.connect(`mongodb://${config.get('server.mongo')}/twiback`)

// const passport = require('./passport')(User,db)
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
// app.use(bodyParser.urlencoded({ limit:'100mb',extended: true }))
// app.use(bodyParser.json({limit:'100mb'}))
// app.use(passport.initialize())
// app.use(passport.session())
app.use(express.static('./public'))
app.set('view engine', 'ejs');

io.on('connection',async socket => {
  console.log('connected')
})

const server = http.listen(process.env.PORT || config.get('server.port'), () => console.log("Node.js is listening to PORT:" + server.address().port))

app.get('/', async (req, res) => {
  res.render('pages/index');
});

