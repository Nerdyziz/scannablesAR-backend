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

// Update upload to handle fields
const uploadFields = upload.fields([
  { name: 'modelFile', maxCount: 1 }, 
  { name: 'bgFile', maxCount: 1 }
]);

app.post('/api/upload', checkAdmin, (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Upload error', details: err.message });

    try {
      if (!req.files || !req.files.modelFile) {
        return res.status(400).json({ error: 'Model file is required' });
      }

      // Get paths
      const modelUrl = req.files.modelFile[0].path || req.files.modelFile[0].secure_url;
      let bgUrl = '';
      if (req.files.bgFile) {
        bgUrl = req.files.bgFile[0].path || req.files.bgFile[0].secure_url;
      }

      const { name, qty, sold } = req.body;

      const model = new Model({
        name: name || req.files.modelFile[0].originalname,
        url: modelUrl,
        bgUrl: bgUrl,
        qty: qty || 100,
        sold: sold || 0
      });

      await model.save();
      
      const frontendBase = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
      const viewLink = `${frontendBase}/view/${model.shortId}`;

      return res.status(201).json({ success: true, model, viewLink });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// 2. UPDATE STATS ROUTE (Admin)
app.patch('/api/models/:shortId', checkAdmin, async (req, res) => {
  try {
    const { qty, sold, name } = req.body;
    const updateData = {};
    if (qty !== undefined) updateData.qty = qty;
    if (sold !== undefined) updateData.sold = sold;
    if (name) updateData.name = name;

    const model = await Model.findOneAndUpdate(
      { shortId: req.params.shortId }, 
      updateData, 
      { new: true }
    );
    if (!model) return res.status(404).json({ error: 'Not found' });
    res.json(model);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});
app.get('/api/models', async (req, res) => {
  try {
    // Sort by newest first
    const models = await Model.find().sort({ createdAt: -1 });
    return res.json(models);
  } catch (err) {
    console.error('GET /api/models error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// 5. GET SINGLE MODEL (Required for Viewer Page)
app.get('/api/models/:shortId', async (req, res) => {
  try {
    const shortId = req.params.shortId;
    const model = await Model.findOne({ shortId });
    if (!model) return res.status(404).json({ error: 'Model not found' });

    // === FIX: INCREMENT VIEWS HERE ===
    model.views = (model.views || 0) + 1;
    await model.save();
    // =================================

    return res.json(model);
  } catch (err) {
    console.error('GET /api/models/:shortId error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// 3. LIKE ROUTE (Public)
app.post('/api/models/:shortId/like', async (req, res) => {
  try {
    const { change } = req.body; // Expects { change: 1 } or { change: -1 }
    const val = change && (change === 1 || change === -1) ? change : 1;

    const model = await Model.findOne({ shortId: req.params.shortId });
    if (!model) return res.status(404).json({ error: 'Not found' });
    
    // Update likes (prevent going below 0)
    model.likes = Math.max(0, (model.likes || 0) + val);
    
    await model.save();
    res.json({ likes: model.likes });
  } catch (err) {
    res.status(500).json({ error: 'Error liking' });
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
