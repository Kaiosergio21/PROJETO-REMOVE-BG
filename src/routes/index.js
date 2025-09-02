const express = require('express');
const router = express.Router();
const removeBgController = require('../controllers/removeBgController');
const upload = require('../config/multerConfig');

router.post('/remove-bg', upload, removeBgController.removeBackground);

module.exports = router;