const ApiError = require('../../../core/errors/ApiError');
const { getStorageProvider } = require('../../../core/storage');
const { sequelize } = require('../../../database/models');
const MediaRepository = require('../repositories/media.repository');
const {
  SECTION_KEYS,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_FILE_SIZE_BY_SECTION,
} = require('../constants/media.constants');
const { buildUniqueFilename, getFileExtension } = require('../helpers/filename.helper');

class MediaService {
  static normalizeSection(section) {
    const normalized = String(section || '').toLowerCase().trim();

    if (!Object.values(SECTION_KEYS).includes(normalized)) {
      throw ApiError.badRequest(`Unsupported upload section: ${section}`);
    }

    return normalized;
  }

  static resolveMonthBucket(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  static validateFile(file, section) {
    if (!file) {
      throw ApiError.badRequest('Image file is required');
    }

    const normalizedSection = this.normalizeSection(section);
    const maxSize = MAX_FILE_SIZE_BY_SECTION[normalizedSection] || MAX_FILE_SIZE_BY_SECTION[SECTION_KEYS.TEMP];
    const extension = getFileExtension(file.originalname);
    const normalizedMimeType = String(file.mimetype || '').toLowerCase();

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMimeType)) {
      throw ApiError.badRequest('Unsupported MIME type. Allowed: jpg, jpeg, png, webp');
    }

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      throw ApiError.badRequest('Unsupported file extension. Allowed: jpg, jpeg, png, webp');
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw ApiError.badRequest('Uploaded file is empty');
    }

    if (file.size > maxSize) {
      throw ApiError.badRequest(`File exceeds maximum allowed size (${Math.floor(maxSize / (1024 * 1024))}MB)`);
    }

    return {
      extension,
      maxSize,
      normalizedSection,
    };
  }

  /**
   * Build an S3 object key for the file.
   * Format: {section}/{month-bucket}/{filename}
   */
  static buildObjectKey(section, filename, monthBucket = this.resolveMonthBucket()) {
    const normalizedSection = this.normalizeSection(section);
    const safeFilename = String(filename || '').replace(/\\/g, '/').split('/').pop();

    if (!safeFilename || safeFilename.includes('..')) {
      throw ApiError.badRequest('Unsafe file name');
    }

    return `${normalizedSection}/${monthBucket}/${safeFilename}`;
  }

  /**
   * Upload a file to S3 and return the public URL.
   */
  static async uploadFile({ section, file, baseName }) {
    const { extension, normalizedSection } = this.validateFile(file, section);
    const monthBucket = this.resolveMonthBucket();
    const filename = buildUniqueFilename({
      baseName,
      originalName: file.originalname,
      extension,
    });
    const objectKey = this.buildObjectKey(normalizedSection, filename, monthBucket);
    const mimeType = String(file.mimetype || '').toLowerCase();

    const storage = getStorageProvider();
    const publicUrl = await storage.upload(file.buffer, objectKey, mimeType);

    return {
      path: publicUrl,
      filename,
      size: file.size,
      mimeType,
    };
  }

  /**
   * Delete a file from S3 given its stored URL.
   */
  static async deleteFile(storedPath) {
    if (!storedPath || typeof storedPath !== 'string') {
      return;
    }

    const storage = getStorageProvider();
    const s3Key = storage.extractKeyFromUrl(storedPath);

    if (!s3Key) {
      return;
    }

    try {
      await storage.delete(s3Key);
    } catch (error) {
      // Log but don't throw — deletion failures shouldn't block business logic
      console.error(`[MediaService] Failed to delete S3 object "${s3Key}":`, error.message);
    }
  }

  static async deleteFiles(paths = []) {
    const uniquePaths = [...new Set(paths.filter((item) => typeof item === 'string' && item.trim()))];

    await Promise.all(uniquePaths.map((item) => this.deleteFile(item)));
  }

  static async replaceFile({ section, file, previousPath, baseName }) {
    const uploaded = await this.uploadFile({ section, file, baseName });

    if (previousPath && previousPath !== uploaded.path) {
      await this.deleteFile(previousPath);
    }

    return uploaded;
  }

  static async assignEntityFile({ section, entityId, file, baseName }) {
    const normalizedSection = this.normalizeSection(section);
    const transaction = await sequelize.transaction();
    let uploadedPath = null;
    let previousPath = null;

    try {
      const entity = await MediaRepository.findEntityBySectionAndId(normalizedSection, entityId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!entity) {
        const label = MediaRepository.getEntityLabel(normalizedSection);
        throw ApiError.notFound(`${label} not found`);
      }

      previousPath = MediaRepository.getEntityPath(normalizedSection, entity);

      const uploaded = await this.uploadFile({ section: normalizedSection, file, baseName });
      uploadedPath = uploaded.path;

      await MediaRepository.updateEntityPath(normalizedSection, entity, uploaded.path, { transaction });

      await transaction.commit();

      if (previousPath && previousPath !== uploadedPath) {
        await this.deleteFile(previousPath);
      }

      return {
        path: uploadedPath,
      };
    } catch (error) {
      await transaction.rollback();

      if (uploadedPath) {
        await this.deleteFile(uploadedPath);
      }

      throw error;
    }
  }

  static async removeEntityFile({ section, entityId }) {
    const normalizedSection = this.normalizeSection(section);

    return sequelize.transaction(async (transaction) => {
      const entity = await MediaRepository.findEntityBySectionAndId(normalizedSection, entityId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!entity) {
        const label = MediaRepository.getEntityLabel(normalizedSection);
        throw ApiError.notFound(`${label} not found`);
      }

      const previousPath = MediaRepository.getEntityPath(normalizedSection, entity);

      if (!previousPath) {
        return { path: null };
      }

      await MediaRepository.updateEntityPath(normalizedSection, entity, null, { transaction });

      return {
        path: previousPath,
      };
    }).then(async (result) => {
      if (result.path) {
        await this.deleteFile(result.path);
      }

      return { deleted: true };
    });
  }
}

module.exports = MediaService;
