const CategoryRepository = require('../repositories/category.repository');
const CatalogDiscoveryService = require('./catalogDiscovery.service');

class CategoryService {
  static async getTree({ status }) {
    const categories = await CategoryRepository.list({ status });

    const categoryMap = new Map();

    categories.forEach((category) => {
      categoryMap.set(category.id, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        status: category.status,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        children: [],
      });
    });

    const roots = [];

    categoryMap.forEach((category) => {
      if (category.parentId && categoryMap.has(category.parentId)) {
        categoryMap.get(category.parentId).children.push(category);
      } else {
        roots.push(category);
      }
    });

    return roots;
  }

  static async getProductsBySlug(slug, query = {}) {
    return CatalogDiscoveryService.listByCategorySlug(slug, query);
  }
}

module.exports = CategoryService;
