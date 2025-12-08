const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const ModelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url:  { type: String, required: true },  // 3D Model URL
  bgUrl: { type: String, default: '' },    // NEW: Background Image URL
  shortId: { type: String, default: () => nanoid(10), index: { unique: true } },
  
  // Stats
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },     // NEW
  qty: { type: Number, default: 100 },     // NEW: Total Supply
  sold: { type: Number, default: 0 },      // NEW: Total Sold
  
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Model', ModelSchema);