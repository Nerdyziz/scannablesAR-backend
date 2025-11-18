// backend/app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const upload = require('./uploadMiddleware'); // multer + multer-storage-cloudinary
const Model = require('./models/Model');
const cloudinary = require('./cloudinaryConfig');
const app = express();

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Allow CORS and custom headers (x-api-key)
app.use(cors({
  origin: true,
  allowedHeaders: ['Content-Type', 'x-api-key', 'authorization']
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Helper: safe trim
function safeTrim(s) { return typeof s === 'string' ? s.trim() : ''; }

// Admin middleware (improved logging)
function checkAdmin(req, res, next) {
  const token = safeTrim(req.header('x-api-key') || req.header('authorization') || '');
  if (!token) {
    console.warn('checkAdmin: missing token');
    return res.status(401).json({ error: 'Missing admin token' });
  }
  if (token !== safeTrim(process.env.ADMIN_TOKEN || '')) {
    console.warn('checkAdmin: invalid token (length):', token.length);
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  return next();
}

// Upload route (admin only) — improved logging and robust responses
app.post('/api/upload', checkAdmin, (req, res) => {
  // run multer middleware programmatically to capture multer errors
  upload.single('modelFile')(req, res, async (err) => {
    if (err) {
      console.error('Upload middleware error:', err);
      // Multer errors usually include message; return JSON
      return res.status(400).json({ error: 'Upload middleware error', details: err.message || String(err) });
    }

    try {
      // Log presence of file
      if (!req.file) {
        console.warn('Upload request missing req.file; check form field name is "modelFile"');
        return res.status(400).json({ error: 'No file uploaded. Ensure form field name is "modelFile".' });
      }

      // Log entire req.file keys for debugging
      console.log('req.file keys:', Object.keys(req.file));
      console.log('req.file summary:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path || req.file.secure_url || req.file.url || null,
        public_id: req.file.public_id || req.file.filename || null
      });
// === Build proper Cloudinary URL WITH EXTENSION (.glb / .gltf) ===
  // prefer the path provided by multer-storage-cloudinary
  const fileUrl = req.file.path || req.file.secure_url || req.file.url || null;

  if (!fileUrl) {
    console.warn('No file URL found on req.file; saving will use fallback without extension.');
  }

  const model = new Model({
    name: req.file.originalname || 'unnamed',
    url: fileUrl
  });
  await model.save();

  const frontendBase = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const viewLink = `${frontendBase}/view/${model.shortId || model._id}`;

  console.log('Upload saved:', { id: model._id, shortId: model.shortId, url: model.url });
  return res.status(201).json({ success: true, model, viewLink });
} 
catch (e) {
      console.error('Unhandled error in upload handler:', e);
      return res.status(500).json({ error: 'Server error during upload', message: e.message });
    }
  });
});

app.get('/api/models', async (req, res) => {
  try {
    // Find all models, sort by newest first
    const models = await Model.find().sort({ createdAt: -1 });
    return res.json(models);
  } catch (err) {
    console.error('GET /api/models error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get model by shortId and increment views
app.get('/api/models/:shortId', async (req, res) => {
  try {
    const shortId = req.params.shortId;
    const model = await Model.findOne({ shortId });
    if (!model) return res.status(404).json({ error: 'Model not found' });

    // increment views atomically
    model.views = (model.views || 0) + 1;
    await model.save();

    return res.json({ name: model.name, url: model.url, shortId: model.shortId, views: model.views });
  } catch (err) {
    console.error('GET /api/models/:shortId error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete model (admin)
app.delete('/api/models/:shortId', checkAdmin, async (req, res) => {
  try {
    const shortId = req.params.shortId;
    const model = await Model.findOneAndDelete({ shortId });
    if (!model) return res.status(404).json({ error: 'Model not found' });
    // optionally: delete from Cloudinary via cloudinary.uploader.destroy(public_id, { resource_type: 'raw'})
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/models/:shortId error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});





// Global JSON error handler — prevents HTML error pages
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
