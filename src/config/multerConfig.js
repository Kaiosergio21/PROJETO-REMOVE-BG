// multerConfig.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: path.resolve(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);

  }
});

// Para múltiplos campos
const upload = multer({ storage }).fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 }
]);

module.exports = upload;