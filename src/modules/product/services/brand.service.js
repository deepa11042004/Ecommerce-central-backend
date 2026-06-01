const ProductRepository = require('../repositories/product.repository');
const CatalogDiscoveryService = require('./catalogDiscovery.service');

class BrandService {
  static async list(query = {}) {
    return ProductRepository.listBrands({
      search: query.search || '',
      status: query.status || 'active',
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  static async getProductsBySlug(slug, query = {}) {
    return CatalogDiscoveryService.listByBrandSlug(slug, query);
  }
}

module.exports = BrandService;
