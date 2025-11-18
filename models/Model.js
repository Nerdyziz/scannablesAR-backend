// backend/models/Model.js
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const ModelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url:  { type: String, required: true },  // Cloudinary URL
  shortId: { type: String, default: () => nanoid(10), index: { unique: true } },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Model', ModelSchema);
