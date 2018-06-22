const
  router = require('express').Router(),
  exec = require('child_process').exec,
  execSync = require('child_process').execSync,
  tool = require('../tool')

module.exports = (db,VPS,User,ssh) => {

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

  const random = () => {
    let str = "abcdefghijklmnopqrstuvwxyz"
    let result = ""
    for(var i=0;i<10;i++) result += str.charAt(Math.floor(Math.random() * str.length))
    return result;
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

  router.post('/new', tool.isLogined, async (req,res) => {
    let port = 0;
    while(true){
      port = Math.floor( Math.random() * 16384 ) + 49152;
      let a = await (new Promise((resolve,reject) => {
        VPS.findOne({port: port},(err,result) => {
          if(err)            return reject("err")
          if(result != null) return resolve("found");
          resolve("notfound")
        })
      }).catch((e) => console.log(e))
      )
      if (a == "notfound") break;
    }
    let addr = ""
    while(true){
      addr = random()
      let a = await (new Promise((resolve,reject) => {
        VPS.findOne({internal_addr: addr},(err,result) => {
          if(err)            return reject("err")
          if(result != null) return resolve("found");
          resolve("notfound")
        })
      }).catch((e) => console.log(e))
      )
      if (a == "notfound") break;
    }

    let container_id = execSync(`docker run --restart=always --net=mizucoffeenet_mizucoffee-net-network -p ${port}:${port} --name ${addr} --cpus ${req.body.core} -m ${req.body.memory}G -d ssh_${req.body.os}`).toString().substr(0,12)
    execSync(`mkdir /ssh/config/${container_id}; echo 'root@${addr}' > /ssh/config/${container_id}/sshpiper_upstream`)
    execSync(`ssh-keygen -t rsa -N '${req.body.password}' -f /ssh/config/${container_id}/id_rsa-client && mv /ssh/config/${container_id}/id_rsa-client.pub /ssh/config/${container_id}/authorized_keys;chmod 600 /ssh/config/${container_id}/authorized_keys`)
    execSync(`ssh-keygen -t rsa -N '' -f /ssh/config/${container_id}/id_rsa`)
    execSync(`docker cp /ssh/config/${container_id}/id_rsa.pub ${container_id}:/root/.ssh/`)
    execSync(`rm /ssh/config/${container_id}/id_rsa.pub`)
    execSync(`docker exec ${container_id} sh -c "mv /root/.ssh/id_rsa.pub /root/.ssh/authorized_keys"`)
    ssh.kill()
    ssh = exec(`/ssh/start.sh`, (err,stdout,stderr) => {
      if (err) console.log(err)
      console.log(stdout)
    })
    execSync(`echo 'server {listen 80; server_name ${container_id}.vps.mizucoffee.net;location / {proxy_pass http://${addr}/;}}' > /etc/nginx/conf.d/${container_id}.conf`)
    execSync(`nginx -s reload`)

    let v = new VPS({
      name: req.body.name,
      internal_addr: addr,
      port: port,
      container_id: container_id,
      domain: `${container_id}.vps.mizucoffee.net`,
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
    res.download(`/ssh/config/${req.query.id}/id_rsa-client`,`${req.query.id}.id_rsa`)
  })

  router.get('/remove', tool.isLogined, isVPSExist, async (req,res) => {
    execSync(`docker stop ${req.query.id};docker rm -f ${req.query.id};exit 0`)
    // execSync(`rm ./keys/${req.query.id}*`)
    execSync(`rm /etc/nginx/conf.d/${req.query.id}.conf`)
    execSync(`nginx -s reload`)
    execSync(`rm -rf /ssh/config/${req.query.id}`)
    ssh.kill()
    ssh = exec(`/ssh/start.sh`, (err,stdout,stderr) => {
      if (err) console.log(err)
      console.log(stdout)
    })

    console.log(req.user)
    VPS.deleteOne({container_id: req.query.id ,user_id:req.user._id},(err) => {} )
    res.redirect(`/vps`)
  })

  return router
}
