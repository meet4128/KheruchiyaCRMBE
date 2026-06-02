const memberService = require('../services/memberService');
const asyncHandler = require('../utils/asyncHandler');
const { messages } = require('../locales');

const createMember = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const payload = {
    ...req.body,
    createdBy: userId,
  };

  const { member, invite } = await memberService.createMember(payload);

  res.status(201).json({
    status: 'success',
    data: {
      member,
      invite,
    },
  });
});

const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const member = await memberService.updateMember(id, req.body);

  res.status(200).json({
    status: 'success',
    data: {
      member,
    },
  });
});

const resendInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { member, invite } = await memberService.resendInvitation(id, {
    createdBy: req.user?.id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      member,
      invite,
    },
  });
});

const getMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const member = await memberService.getMemberById(id);

  res.status(200).json({
    status: 'success',
    data: {
      member,
    },
  });
});

const getMembers = asyncHandler(async (req, res) => {
  const result = await memberService.getMembers(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getMembersDirectory = asyncHandler(async (req, res) => {
  const result = await memberService.getMembersDirectory(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const deleteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const member = await memberService.deleteMember(id);

  res.status(200).json({
    status: 'success',
    data: {
      member,
    },
  });
});

const FIELD_TO_URL = {
  aadharCard: 'aadharDocumentUrl',
  panCard: 'panDocumentUrl',
  cancelCheque: 'cancelChequeDocumentUrl',
};

/**
 * Stores uploaded PDF/images and returns public paths for use in POST/PATCH member JSON.
 */
const uploadMemberDocuments = asyncHandler(async (req, res) => {
  const files = req.files || {};
  const urls = {};

  for (const [field, urlKey] of Object.entries(FIELD_TO_URL)) {
    const arr = files[field];
    const file = Array.isArray(arr) ? arr[0] : null;
    if (file?.filename) {
      urls[urlKey] = `/uploads/members/${file.filename}`;
    }
  }

  if (Object.keys(urls).length === 0) {
    return res.status(400).json({
      status: 'fail',
      data: { message: messages.validation.member.documentUploadAtLeastOne },
    });
  }

  res.status(200).json({
    status: 'success',
    data: { urls },
  });
});

module.exports = {
  createMember,
  updateMember,
  resendInvitation,
  deleteMember,
  getMember,
  getMembers,
  getMembersDirectory,
  uploadMemberDocuments,
};
