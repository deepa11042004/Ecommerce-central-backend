const ApiError = require('../../../core/errors/ApiError');
const MediaService = require('../../media/services/media.service');
const HeroBannerRepository = require('../repositories/heroBanner.repository');

class HeroBannerService {
  static async listPublic() {
    const banners = await HeroBannerRepository.list();

    return banners.map((banner) => this.serialize(banner));
  }

  static async listAdmin() {
    const banners = await HeroBannerRepository.list({ includeInactive: true });

    return banners.map((banner) => this.serialize(banner));
  }

  static async create(payload) {
    const banner = await HeroBannerRepository.create({
      title: payload.title,
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

    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      link: banner.link,
      image: banner.imagePath,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    };
  }
}

module.exports = HeroBannerService;
