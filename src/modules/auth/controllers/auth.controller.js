const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const AuthService = require('../services/auth.service');

const login = asyncHandler(async (req, res) => {
  const data = await AuthService.login(req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Login successful',
    data,
  });
});

const register = asyncHandler(async (req, res) => {
  const data = await AuthService.register(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Registration successful',
    data,
  });
});

const loginAdminPanel = asyncHandler(async (req, res) => {
  const data = await AuthService.loginAdminPanel(req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Admin panel login successful',
    data,
  });
});

const loginDeveloperPanel = asyncHandler(async (req, res) => {
  const data = await AuthService.loginDeveloperPanel(req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Developer panel login successful',
    data,
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const data = await AuthService.refreshToken(req.body.refreshToken);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Token refreshed successfully',
    data,
  });
});

module.exports = {
  register,
  login,
  loginAdminPanel,
  loginDeveloperPanel,
  refreshToken,
};
