const ProductRepository = require('../repositories/product.repository');

class BrandService {
  static async list(query = {}) {
    return ProductRepository.listBrands({
      search: query.search || '',
      status: query.status || 'active',
      limit: query.limit ? Number(query.limit) : 20,
    });
  }
}

module.exports = BrandService;
