const multer = require('multer');
const ApiError = require('../../../core/errors/ApiError');
const { MAX_FILE_SIZE_ANY_SECTION } = require('../constants/media.constants');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_ANY_SECTION,
    files: 1,
  },
});

const singleImageUpload = (fieldName = 'file') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('File is too large for allowed upload limits'));
      }

      if (error.name === 'MulterError') {
        return next(ApiError.badRequest(error.message));
      }

      return next(error);
    });
  };
};

module.exports = {
  singleImageUpload,
};
