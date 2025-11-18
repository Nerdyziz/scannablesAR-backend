// backend/uploadMiddleware.js
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cloudinary = require('./cloudinaryConfig');
const path = require('path');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
  const ext = path.extname(file.originalname).toLowerCase();  // .glb or .gltf
  const base = path.basename(file.originalname, ext)
                .replace(/[^a-zA-Z0-9]/g, "-");

  return {
    folder: "3d-models",
    public_id: `${Date.now()}-${base}${ext}`,  // <-- extension preserved
    resource_type: "raw"
  };
}
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024,                          // 100 MB limit
  },
});

module.exports = upload;
