const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const ModelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url:  { type: String, required: true },  // Cloudinary URL
  shortId: { type: String, default: () => nanoid(10), index: { unique: true } },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },

  // === ADD THIS SECTION ===
  info: {
    tl: { type: String, default: '' }, // Top Left
    tr: { type: String, default: '' }, // Top Right
    bl: { type: String, default: '' }, // Bottom Left
    br: { type: String, default: '' }  // Bottom Right
  }
  // ========================
});

module.exports = mongoose.model('Model', ModelSchema);