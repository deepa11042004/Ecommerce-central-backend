const { Product, Inventory } = require('../../../database/models');

class InventoryRepository {
  static findProductByIdForUpdate(id, { transaction } = {}) {
    return Product.findByPk(id, {
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  }

  static findInventoryByVariantIdForUpdate(variantId, { transaction } = {}) {
    return Inventory.findOne({
      where: { variantId },
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  }

  static updateProductStock(product, nextStock, { transaction } = {}) {
    return product.update({ stock: nextStock }, { transaction });
  }

  static updateInventoryQuantity(inventory, nextQuantity, { transaction } = {}) {
    return inventory.update({ quantity: nextQuantity }, { transaction });
  }
}

module.exports = InventoryRepository;
