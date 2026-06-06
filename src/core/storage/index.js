const env = require('../../config/env');
const S3StorageProvider = require('./s3.provider');

let storageProvider = null;

/**
 * Returns the singleton storage provider instance.
 * Currently only S3 is supported; the abstraction makes it easy
 * to add other providers (local, GCS, R2) in the future.
 */
const getStorageProvider = () => {
  if (storageProvider) {
    return storageProvider;
  }

  const provider = (env.STORAGE_PROVIDER || 's3').toLowerCase();

  switch (provider) {
    case 's3':
      storageProvider = new S3StorageProvider({
        region: env.AWS_REGION,
        bucket: env.AWS_S3_BUCKET,
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      });
      break;

    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }

  return storageProvider;
};

module.exports = { getStorageProvider };
