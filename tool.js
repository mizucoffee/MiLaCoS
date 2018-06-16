

module.exports = {
  isLogined: (req, res, next) => {
    if(req.isAuthenticated()) return next();
    res.redirect("/");
  }
}
