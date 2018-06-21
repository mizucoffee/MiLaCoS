const Schema = require('mongoose').Schema

module.exports = (db) => {
  const VPSSchema = new Schema({
    name: {type: String, required: true},
    port: {type: String, required: true},
    internal_addr: {type: String, required: true},
    container_id: {type: String, required: true},
    domain: {type: String, required: true},
    os: {type: String, required: true},
    core: {type: String, required: true},
    memory: {type: String, required: true},
    user_id: {type: String, required: true}
  }, {timestamps: { createdAt: 'created_at' }})
  return db.model("vps", VPSSchema);
}
