const mongoose = require('mongoose');
const shortid = require('shortid');

const ModelSchema = new mongoose.Schema({
  name: String,
  url: String,
  shortId: { type: String, default: shortid.generate },
  views: { type: Number, default: 0 },
  // ADD THIS SECTION
  info: {
    tl: { type: String, default: '' }, // Top Left
    tr: { type: String, default: '' }, // Top Right
    bl: { type: String, default: '' }, // Bottom Left
    br: { type: String, default: '' }  // Bottom Right
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Model', ModelSchema);