const
  router = require('express').Router(),
  execSync = require('child_process').execSync,
  tool = require('../tool')


module.exports = (db,VPS,User) => {
  router.get('/', tool.isLogined, async (req,res) => {
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

  router.get('/new', tool.isLogined, (req,res) => {
    res.render('pages/vps-new');
  })

  router.post('/new', tool.isLogined, (req,res) => {
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
  return router
}
