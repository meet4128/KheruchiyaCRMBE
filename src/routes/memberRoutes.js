const express = require('express');
const memberController = require('../controllers/memberController');
const validateMember = require('../middlewares/validateMember');
const validateMemberUpdate = require('../middlewares/validateMemberUpdate');
const validateMemberQuery = require('../middlewares/validateMemberQuery');
const validateMemberDirectoryQuery = require('../middlewares/validateMemberDirectoryQuery');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');
const { uploadMemberDocuments } = require('../middlewares/uploadMemberDocuments');
const parseMemberMultipartBody = require('../middlewares/parseMemberMultipartBody');

const router = express.Router();

router.post(
  '/document-uploads',
  authMiddleware,
  requireRoles('admin'),
  uploadMemberDocuments,
  memberController.uploadMemberDocuments
);
router.post(
  '/',
  authMiddleware,
  requireRoles('admin'),
  parseMemberMultipartBody,
  validateMember,
  memberController.createMember
);
router.patch(
  '/:id',
  authMiddleware,
  requireRoles('admin'),
  parseMemberMultipartBody,
  validateMemberUpdate,
  memberController.updateMember
);
router.post(
  '/:id/invitations/resend',
  authMiddleware,
  requireRoles('admin'),
  memberController.resendInvitation
);
router.delete('/:id', authMiddleware, requireRoles('admin'), memberController.deleteMember);
router.get(
  '/directory',
  authMiddleware,
  requireRoles('sales', 'admin'),
  validateMemberDirectoryQuery,
  memberController.getMembersDirectory
);
router.get('/:id', authMiddleware, requireRoles('admin'), memberController.getMember);
router.get(
  '/',
  authMiddleware,
  requireRoles('admin'),
  validateMemberQuery,
  memberController.getMembers
);

module.exports = router;
