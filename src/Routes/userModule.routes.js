const express = require('express');
const router = express.Router();
const userModuleController = require('../Controllers/userModule.controller');

router.post('/toggle', userModuleController.toggleUserModule);
router.get('/:adminId', userModuleController.getUserModules);

module.exports = router;
