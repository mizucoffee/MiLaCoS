'use strict'

const express = require('express'),
  session = require('express-session'),
  config = require('config'),
  db = require('mongoose'),
  bodyParser = require('body-parser'),
  app = express(),
  http = require('http'),
  crypto = require('crypto'),
  io = require('socket.io')(http),
  MongoStore = require('connect-mongo')(session),
  exec = require('child_process').exec,
  execSync = require('child_process').execSync,
  Schema = db.Schema

db.connect(`mongodb://${config.get('server.mongo')}/milacos`)

const VPS = require('./db/vps.js')(db),
  User = require('./db/user.js')(db),
  passport = require('./passport')(db,VPS,User),
  tool = require('./tool')

const sessionMiddleware = session({
  store: new MongoStore({
    db: 'session',
    host: config.get('server.mongo'),
    port: '27017',
    url: `mongodb://${config.get('server.mongo')}/milacos`
  }),
  secret: 'milacos',
  resave: false,
  saveUninitialized: false
})

let nginx = exec(`nginx`, (err,stdout,stderr) => {
  if (err) { console.log(err); }
  console.log(stdout);
});

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

const server = app.listen(process.env.PORT || 3000,function(){})

app.use("/vps",require('./routes/vps')(db,VPS,User,nginx))



app.get('/', (req, res) => {
  res.render('pages/index',{'isLogined': req.isAuthenticated()});
});

app.get('/dashboard', tool.isLogined, (req, res) => {
  res.render('pages/dashboard');
});

app.post('/login', passport.authenticate('local', { successRedirect: '/dashboard',failureRedirect: '/' }));

app.get('/logout', tool.isLogined, (req, res) => {
  req.logout()
  res.redirect('/')
})


app.get('/adduser', (req,res) => {
  res.render('pages/adduser');
})

app.post('/adduser', async (req,res) => {
  const result = await (new Promise((resolve,reject) => {
    User.findOne({ id: req.body.id }, (err,result) => {
      if(err) reject(err);
      resolve(result !== null)
    });
  })).catch((e) => console.log(e))
  if (result) return res.send('confrict')

  const sha512 = crypto.createHash('sha512')
  sha512.update(req.body.password)
  var hash = sha512.digest('hex');
  console.log(hash)

  let u = new User({
    id: req.body.id,
    password: hash,
    name: req.body.name,
    role: req.body.role
  })
  u.save((err,result) => {
    if (err) { console.log(err); }
    res.send('success');
  });
})
