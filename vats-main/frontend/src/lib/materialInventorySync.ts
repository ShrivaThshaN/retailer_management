// Material-Inventory synchronization utilities
import { inventoryData, materialRequirementData, productMaterialMapping } from "@/data/mockData";

export interface MaterialUpdate {
  itemCode: string;
  itemName: string;
  quantityUsed: number;
}

/**
 * Process production completion: reduce inventory and update material requirements
 */
export const processProductionCompletion = (
  productName: string,
  orderNumber: string
): { success: boolean; updates: MaterialUpdate[]; errors: string[] } => {
  const requiredMaterials = productMaterialMapping[productName];
  
  if (!requiredMaterials) {
    return {
      success: false,
      updates: [],
      errors: [`No material mapping found for product: ${productName}`]
    };
  }

  const updates: MaterialUpdate[] = [];
  const errors: string[] = [];

  // Check if sufficient inventory exists
  requiredMaterials.forEach(material => {
    const inventoryItem = inventoryData.find(item => item.itemCode === material.itemCode);
    
    if (!inventoryItem) {
      errors.push(`Material ${material.itemName} (${material.itemCode}) not found in inventory`);
      return;
    }

    if (inventoryItem.currentStock < material.quantity) {
      errors.push(
        `Insufficient stock for ${material.itemName}: required ${material.quantity}, available ${inventoryItem.currentStock}`
      );
    }
  });

  // If errors exist, don't process
  if (errors.length > 0) {
    return { success: false, updates: [], errors };
  }

  // Update inventory quantities
  requiredMaterials.forEach(material => {
    const inventoryItem = inventoryData.find(item => item.itemCode === material.itemCode);
    
    if (inventoryItem) {
      // Reduce inventory
      inventoryItem.currentStock -= material.quantity;
      
      // Update status based on new stock level
      if (inventoryItem.currentStock === 0) {
        inventoryItem.status = "Out of Stock";
      } else if (inventoryItem.currentStock <= inventoryItem.minimumStock) {
        inventoryItem.status = "Low Stock";
      } else {
        inventoryItem.status = "In Stock";
      }
      
      // Update last updated date
      inventoryItem.lastUpdated = new Date().toISOString().split('T')[0];
      
      updates.push({
        itemCode: material.itemCode,
        itemName: material.itemName,
        quantityUsed: material.quantity
      });
    }
  });

  // Update material requirements to show materials have been used
  materialRequirementData.forEach(mrpItem => {
    if (mrpItem.relatedOrder === orderNumber) {
      const inventoryItem = inventoryData.find(item => 
        item.itemName.toLowerCase().includes(mrpItem.materialName.toLowerCase()) ||
        mrpItem.materialName.toLowerCase().includes(item.itemName.toLowerCase())
      );
      
      if (inventoryItem) {
        mrpItem.availableQty = inventoryItem.currentStock;
        mrpItem.shortfall = Math.max(0, mrpItem.requiredQty - mrpItem.availableQty);
        mrpItem.status = mrpItem.shortfall === 0 ? "Available" : 
                        mrpItem.shortfall < mrpItem.requiredQty ? "Shortage" : "Required";
      }
    }
  });

  return { success: true, updates, errors: [] };
};

/**
 * Get materials required for a specific product
 */
export const getProductMaterials = (productName: string) => {
  return productMaterialMapping[productName] || [];
};

/**
 * Check if sufficient inventory exists for production
 */
export const checkInventoryAvailability = (productName: string): {
  available: boolean;
  missing: Array<{ itemName: string; required: number; available: number }>;
} => {
  const requiredMaterials = productMaterialMapping[productName];
  
  if (!requiredMaterials) {
    return { available: false, missing: [] };
  }

  const missing: Array<{ itemName: string; required: number; available: number }> = [];

  requiredMaterials.forEach(material => {
    const inventoryItem = inventoryData.find(item => item.itemCode === material.itemCode);
    
    if (!inventoryItem || inventoryItem.currentStock < material.quantity) {
      missing.push({
        itemName: material.itemName,
        required: material.quantity,
        available: inventoryItem?.currentStock || 0
      });
    }
  });

  return {
    available: missing.length === 0,
    missing
  };
};

/**
 * Sync Material Requirements with current Inventory levels
 */
export const syncMaterialRequirementsWithInventory = (): void => {
  materialRequirementData.forEach(mrpItem => {
    // Find matching inventory item by name match
    const inventoryItem = inventoryData.find(item => 
      item.itemName.toLowerCase().includes(mrpItem.materialName.toLowerCase()) ||
      mrpItem.materialName.toLowerCase().includes(item.itemName.toLowerCase())
    );
    
    if (inventoryItem) {
      mrpItem.availableQty = inventoryItem.currentStock;
      mrpItem.shortfall = Math.max(0, mrpItem.requiredQty - mrpItem.availableQty);
      mrpItem.status = mrpItem.shortfall === 0 ? "Available" : 
                      mrpItem.shortfall < mrpItem.requiredQty ? "Shortage" : "Required";
    }
  });
};
