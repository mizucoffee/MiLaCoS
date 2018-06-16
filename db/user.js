const Schema = require('mongoose').Schema

module.exports = (db) => {
  var UserSchema = new Schema({
    id: {type: String, required: true},
    name: {type: String, required: true},
    role: {type: Number, required: true},
    password: {type: String, required: true}
  });
  return db.model("users", UserSchema);
}
