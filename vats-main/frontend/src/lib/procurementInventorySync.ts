// Procurement-Inventory synchronization utilities
import { inventoryData, procurementData } from "@/data/mockData";
import { syncMaterialRequirementsWithInventory } from "./materialInventorySync";

export interface ProcurementReceived {
  poNumber: string;
  itemCode: string;
  itemName: string;
  quantityReceived: number;
}

/**
 * Process procurement receipt: increment inventory when materials are received
 */
export const processProcurementReceipt = (
  poNumber: string,
  previousStatus: string,
  newStatus: string
): { success: boolean; update: ProcurementReceived | null; error?: string } => {
  
  // Only process when status changes to "Received"
  if (newStatus !== "Received" || previousStatus === "Received") {
    return { success: false, update: null };
  }

  // Find the procurement order
  const procurementOrder = procurementData.find(po => po.poNumber === poNumber);
  
  if (!procurementOrder) {
    return {
      success: false,
      update: null,
      error: `Purchase order ${poNumber} not found`
    };
  }

  const itemCode = procurementOrder.itemCode;
  if (!itemCode) {
    return {
      success: false,
      update: null,
      error: `No item code found for PO ${poNumber}`
    };
  }

  // Find the inventory item
  const inventoryItem = inventoryData.find(item => item.itemCode === itemCode);
  
  if (!inventoryItem) {
    return {
      success: false,
      update: null,
      error: `Inventory item ${itemCode} not found`
    };
  }

  // Increment inventory
  const quantityReceived = procurementOrder.quantity;
  inventoryItem.currentStock += quantityReceived;
  
  // Update status based on new stock level
  if (inventoryItem.currentStock >= inventoryItem.maximumStock) {
    inventoryItem.status = "In Stock";
  } else if (inventoryItem.currentStock > inventoryItem.minimumStock) {
    inventoryItem.status = "In Stock";
  } else if (inventoryItem.currentStock > 0) {
    inventoryItem.status = "Low Stock";
  } else {
    inventoryItem.status = "Out of Stock";
  }
  
  // Update last updated date
  inventoryItem.lastUpdated = new Date().toISOString().split('T')[0];

  // Sync material requirements with updated inventory
  syncMaterialRequirementsWithInventory();

  return {
    success: true,
    update: {
      poNumber,
      itemCode,
      itemName: inventoryItem.itemName,
      quantityReceived
    }
  };
};
