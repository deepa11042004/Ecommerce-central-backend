const fs = require('fs');
const path = require('path');
const ApiError = require('../../../core/errors/ApiError');
const { sequelize } = require('../../../database/models');
const MediaRepository = require('../repositories/media.repository');
const {
  SECTION_KEYS,
  UPLOAD_BASE_PATH,
  UPLOAD_ROOT_ABSOLUTE_PATH,
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

  static async createMonthFolder(section) {
    const normalizedSection = this.normalizeSection(section);
    const monthBucket = this.resolveMonthBucket();
    const absoluteFolder = path.join(UPLOAD_ROOT_ABSOLUTE_PATH, normalizedSection, monthBucket);

    await fs.promises.mkdir(absoluteFolder, { recursive: true });

    return {
      absoluteFolder,
      monthBucket,
      section: normalizedSection,
    };
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

  static generatePath(section, filename, monthBucket = this.resolveMonthBucket()) {
    const normalizedSection = this.normalizeSection(section);
    const safeFilename = String(filename || '').replace(/\\/g, '/').split('/').pop();

    if (!safeFilename || safeFilename.includes('..')) {
      throw ApiError.badRequest('Unsafe file name');
    }

    return path.posix.join(UPLOAD_BASE_PATH, normalizedSection, monthBucket, safeFilename);
  }

  static assertRelativeUploadPath(relativePath) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');

    if (!normalized.startsWith(`${UPLOAD_BASE_PATH}/`)) {
      throw ApiError.badRequest('Invalid upload path');
    }

    if (normalized.includes('..')) {
      throw ApiError.badRequest('Unsafe upload path');
    }

    const absolutePath = path.resolve(process.cwd(), normalized);

    if (!absolutePath.startsWith(UPLOAD_ROOT_ABSOLUTE_PATH)) {
      throw ApiError.badRequest('Upload path escapes upload root');
    }

    return {
      normalized,
      absolutePath,
    };
  }

  static async uploadFile({ section, file, baseName }) {
    const { extension, normalizedSection } = this.validateFile(file, section);
    const { absoluteFolder, monthBucket } = await this.createMonthFolder(normalizedSection);
    const filename = buildUniqueFilename({
      baseName,
      originalName: file.originalname,
      extension,
    });
    const absolutePath = path.join(absoluteFolder, filename);

    await fs.promises.writeFile(absolutePath, file.buffer);

    return {
      path: this.generatePath(normalizedSection, filename, monthBucket),
      filename,
      size: file.size,
      mimeType: String(file.mimetype || '').toLowerCase(),
    };
  }

  static async deleteFile(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') {
      return;
    }

    let resolved;

    try {
      resolved = this.assertRelativeUploadPath(relativePath);
    } catch (error) {
      return;
    }

    try {
      await fs.promises.unlink(resolved.absolutePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
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

  static getPublicUrl(relativePath) {
    const { normalized } = this.assertRelativeUploadPath(relativePath);

    return `/${normalized}`;
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
