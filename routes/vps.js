const
  router = require('express').Router(),
  execSync = require('child_process').execSync,
  tool = require('../tool')

module.exports = (db,VPS,User,nginx) => {

  const isVPSExist = async (req, res, next) => {
    let vps = await (new Promise((resolve,reject) => {
      VPS.findOne({container_id: req.query.id ,user_id:req.user._id},(err,result) => {
        if(err) return reject("err")
        if(!result) return reject("none")
        resolve(result)
      })
    })
    ).catch((e) => "none")
    if (vps === "none") res.redirect("/vps")
    next();
  }

  router.get('/', tool.isLogined, async (req,res) => {
    let vps = await (new Promise((resolve,reject) => {
      VPS.find({user_id:req.user._id},(err,result) => {
        if(err)            return reject("err")
        resolve(result)
      })
    })
    ).catch((e) => [])
    vps = vps.map((e,i,a) => {
      e.status = execSync(`docker ps -aqf "id=${e.container_id}" --format "{{.Status}}" | awk '{print $1 }'`).toString();
      return e
    })
    res.render('pages/vps', {vps: vps});
  })

  router.get('/new', tool.isLogined, (req,res) => {
    res.render('pages/vps-new');
  })

  router.post('/new', tool.isLogined, (req,res) => {
    // Math.floor( Math.random() * 16384 ) + 49152;
    let name = Math.random().toString(36).slice(-5) //ユニークにすべき
    let container_id = execSync(`docker run --net=mizucoffeenet_mizucoffee-net-network --name ${name} --cpus ${req.body.core} -m ${req.body.memory}G -d ssh_${req.body.os}`).toString().substr(0,12)
    execSync(`ssh-keygen -t rsa -N ${req.body.password} -f ./keys/${container_id}`)
    execSync(`docker cp ./keys/${container_id}.pub ${container_id}:/root/.ssh/`)
    execSync(`docker exec ${container_id} sh -c "cat /root/.ssh/${container_id}.pub >> /root/.ssh/authorized_keys;chmod 600 /root/.ssh/authorized_keys"`)
    execSync(`echo 'server {listen 80; server_name ${container_id}.vps.mizucoffee.net;location / {proxy_pass http://${name}/;}}' > /etc/nginx/conf.d/${container_id}.conf`)
    nginx.kill();
    nginx = exec(`nginx`, (err,stdout,stderr) => {
      if (err) { console.log(err); }
      console.log(stdout);
    });

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

  router.get('/about', tool.isLogined, isVPSExist, async (req,res) => {
    let vps = await (new Promise((resolve,reject) => {
      VPS.findOne({container_id: req.query.id ,user_id:req.user._id},(err,result) => {
        if(err) return reject("err")
        resolve(result)
      })
    })
    ).catch((e) => {})
    res.render('pages/vps-about',{vps: vps,status: execSync(`docker ps -aqf "id=${req.query.id}" --format "{{.Status}}" | awk '{print $1}'`).toString().trim()})
  })

  router.get('/shutdown', tool.isLogined, isVPSExist, async (req,res) => {
    execSync(`docker stop ${req.query.id}`)
    res.redirect(`/vps/about?id=${req.query.id}`)
  })

  router.get('/poweron', tool.isLogined, isVPSExist, async (req,res) => {
    execSync(`docker start ${req.query.id}`)
    res.redirect(`/vps/about?id=${req.query.id}`)
  })

  router.get('/key', tool.isLogined, isVPSExist, async (req,res) => {
    res.download(`keys/${req.query.id}`,`${req.query.id}.id_rsa`)
  })

  router.get('/remove', tool.isLogined, isVPSExist, async (req,res) => {
    execSync(`docker stop ${req.query.id};docker rm -f ${req.query.id};exit 0`)
    execSync(`rm ./keys/${req.query.id}*`)
    execSync(`rm /etc/nginx/conf.d/${container_id}.conf`)
    nginx.kill();
    nginx = exec(`nginx`, (err,stdout,stderr) => {
      if (err) { console.log(err); }
      console.log(stdout);
    });

    console.log(req.user)
    VPS.deleteOne({container_id: req.query.id ,user_id:req.user._id},(err) => {} )
    res.redirect(`/vps`)
  })

  return router
}
