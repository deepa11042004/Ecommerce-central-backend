const fs = require('fs');
const path = require('path');
const ApiError = require('../../../core/errors/ApiError');
const MediaService = require('../../media/services/media.service');
const HeroBannerRepository = require('../repositories/heroBanner.repository');

class HeroBannerService {
  static generateTitleFromImagePath(imagePath) {
    if (!imagePath) {
      return 'Hero Banner';
    }

    try {
      // Extract filename from path (e.g., "uploads/hero-banners/2026-06/hero-banner-1234567-abc.webp" -> "hero-banner-1234567-abc.webp")
      const filename = path.basename(imagePath);
      // Remove extension
      const nameWithoutExt = filename.replace(/\\.[^/.]+$/, '');
      // Convert to title case: replace hyphens/underscores with spaces and capitalize
      const title = nameWithoutExt
        .split(/[-_]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();

      return title || 'Hero Banner';
    } catch {
      return 'Hero Banner';
    }
  }

  static resolveExistingImagePath(imagePath) {
    if (!imagePath) {
      return null;
    }

    try {
      const { normalized, absolutePath } = MediaService.assertRelativeUploadPath(imagePath);

      if (!fs.existsSync(absolutePath)) {
        return null;
      }

      return normalized;
    } catch {
      return null;
    }
  }

  static async listPublic() {
    const banners = await HeroBannerRepository.list();

    return banners.map((banner) => this.serialize(banner));
  }

  static async listAdmin() {
    const banners = await HeroBannerRepository.list({ includeInactive: true });

    return banners.map((banner) => this.serialize(banner));
  }

  static async create(payload) {
    const titleFromPayload = (payload.title !== undefined && payload.title !== null) ? String(payload.title).trim() : '';
    const finalTitle = titleFromPayload;

    const banner = await HeroBannerRepository.create({
      title: finalTitle,
      subtitle: payload.subtitle || null,
      link: payload.link || null,
      imagePath: payload.image,
      isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
      sortOrder: Number.isInteger(payload.sortOrder) ? payload.sortOrder : 0,
    });

    return this.serialize(banner);
  }

  static async update(id, payload) {
    const banner = await HeroBannerRepository.findById(id);

    if (!banner) {
      throw ApiError.notFound('Hero banner not found');
    }

    const nextPayload = {};

    if (payload.title !== undefined) {
      nextPayload.title = payload.title;
    }

    if (payload.subtitle !== undefined) {
      nextPayload.subtitle = payload.subtitle || null;
    }

    if (payload.link !== undefined) {
      nextPayload.link = payload.link || null;
    }

    if (payload.image !== undefined) {
      nextPayload.imagePath = payload.image;
    }

    if (payload.isActive !== undefined) {
      nextPayload.isActive = payload.isActive;
    }

    if (payload.sortOrder !== undefined) {
      nextPayload.sortOrder = payload.sortOrder;
    }

    const previousImage = payload.image && payload.image !== banner.imagePath ? banner.imagePath : null;
    const updated = await HeroBannerRepository.update(banner, nextPayload);

    if (previousImage) {
      await MediaService.deleteFile(previousImage);
    }

    return this.serialize(updated);
  }

  static async remove(id) {
    const banner = await HeroBannerRepository.findById(id);

    if (!banner) {
      throw ApiError.notFound('Hero banner not found');
    }

    const imagePath = banner.imagePath;
    await HeroBannerRepository.delete(banner);

    if (imagePath) {
      await MediaService.deleteFile(imagePath);
    }

    return { id: banner.id };
  }

  static serialize(banner) {
    if (!banner) {
      return null;
    }

    const image = this.resolveExistingImagePath(banner.imagePath);

    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      link: banner.link,
      image,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    };
  }
}

module.exports = HeroBannerService;
