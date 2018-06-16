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
  crypto = require('crypto'),
  io = require('socket.io')(http),
  MongoStore = require('connect-mongo')(session),
  execSync = require('child_process').execSync,
  Schema = db.Schema

db.connect(`mongodb://${config.get('server.mongo')}/milacos`)

var UserSchema = new Schema({
    id: {type: String, required: true},
    name: {type: String, required: true},
    role: {type: Number, required: true},
    password: {type: String, required: true}
});
var User = db.model("users", UserSchema);

const VPSSchema = new Schema({
  name: {type: String, required: true},
  container_id: {type: String, required: true},
  domain: {type: String, required: true},
  os: {type: String, required: true},
  core: {type: String, required: true},
  memory: {type: String, required: true},
  user_id: {type: String, required: true}
}, {timestamps: { createdAt: 'created_at' }})
var VPS = db.model("vps", VPSSchema);

const passport = require('./passport')(User,db)
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

const isLogined = (req, res, next) => {
  if(req.isAuthenticated()) return next();
  res.redirect("/");
};

var options = {
  cert: fs.readFileSync('./cert/fullchain.pem'),
  key:  fs.readFileSync('./cert/privkey.pem')
};

var server = https.createServer(options,app);
server.listen(config.get('server.https_port'), () => console.log("Node.js is listening to PORT:" + server.address().port));

app.get('/', (req, res) => {
  res.render('pages/index',{'isLogined': req.isAuthenticated()});
});

app.get('/dashboard', isLogined, (req, res) => {
  res.render('pages/dashboard');
});

app.post('/login', passport.authenticate('local', { successRedirect: '/dashboard',failureRedirect: '/' }));

app.get('/logout', isLogined, (req, res) => {
  req.logout()
  res.redirect('/')
})

app.get('/vps', isLogined, async (req,res) => {
  let vps = await (new Promise((resolve,reject) => {
    VPS.find({user_id:req.user._id},(err,result) => {
      if(err)            return reject("err")
      resolve(result)
    })
  })
  ).catch((e) => [])
  vps = vps.map((e,i,a) => {
    e.status = execSync(`docker ps -aqf "id=${e.container_id.substr(0,12)}" --format "{{.Status}}" | awk '{print $1 }'`).toString();
    return e
  })
  res.render('pages/vps', {vps: vps});
})

app.get('/vps/new', isLogined, (req,res) => {
  res.render('pages/vps-new');
})

app.post('/vps/new', isLogined, (req,res) => {
  // Math.floor( Math.random() * 16384 ) + 49152;
  let container_id = execSync(`docker run --cpus ${req.body.core} -m ${req.body.memory}G -d ssh_${req.body.os}`).toString()
  let v = new VPS({
    name: req.body.name,
    container_id: container_id,
    domain: "test",
    os: req.body.os,
    memory: req.body.memory,
    core: req.body.core,
    user_id: req.user._id
  })
  v.save((err,result) => {
    if (err) { console.log(err); }
    res.redirect('/vps#created');
  })
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
