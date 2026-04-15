// Extended mock data for all pages with proper calculations
// Add this utility function to your mockData.js file

/**
 * Deducts materials from inventoryData based on a completed production schedule.
 * @param {string} productName - The name of the product completed (e.g., "Glass Dining Table").
 * @param {string} orderNumber - The customer order number (e.g., "CO-2025-001").
 * @returns {{ success: boolean, message: string }}
 */
export const deductInventory = (productName, orderNumber) => {
    // 1. Get the Bill of Materials (BOM) for the completed product
    const materialsToDeduct = productMaterialMapping[productName];

    if (!materialsToDeduct || materialsToDeduct.length === 0) {
        return { success: true, message: `No material mapping found for ${productName}. Skipping deduction.` };
    }

    const errors = [];
    const updates = [];
    const today = new Date().toISOString().split('T')[0];

    // --- A. PRE-CHECK FOR STOCK AVAILABILITY ---
    // This is crucial in a mock environment to prevent partially updating inventory.
    for (const requiredItem of materialsToDeduct) {
        const inventoryItem = inventoryData.find(inv => inv.itemCode === requiredItem.itemCode);

        if (!inventoryItem) {
            errors.push(`Material ${requiredItem.itemCode} not found in inventory.`);
            continue;
        }

        if (inventoryItem.currentStock < requiredItem.quantity) {
            errors.push(`Insufficient stock for ${requiredItem.itemName} (Needed: ${requiredItem.quantity}, Available: ${inventoryItem.currentStock}).`);
        }
    }

    if (errors.length > 0) {
        return { success: false, message: `Inventory deduction failed for Order ${orderNumber}: ${errors.join(" | ")}` };
    }

    // --- B. PERFORM DEDUCTION (If pre-check passed) ---
    materialsToDeduct.forEach(requiredItem => {
        const inventoryItem = inventoryData.find(inv => inv.itemCode === requiredItem.itemCode);

        // Deduct the quantity
        inventoryItem.currentStock -= requiredItem.quantity;
        inventoryItem.lastUpdated = today;

        // Update status based on new stock
        if (inventoryItem.currentStock <= inventoryItem.minimumStock && inventoryItem.currentStock > 0) {
            inventoryItem.status = "Low Stock";
        } else if (inventoryItem.currentStock <= 0) {
            inventoryItem.status = "Out of Stock";
        } else {
            inventoryItem.status = "In Stock";
        }
        
        updates.push({ itemCode: inventoryItem.itemCode, deducted: requiredItem.quantity });
    });

    return { success: true, message: `Inventory successfully deducted for Order ${orderNumber}.` };
};

export const inventoryData = [
  {
    itemCode: "INV-0001",
    itemName: "Aluminum Rods 6mm",
    category: "Raw Materials",
    currentStock: 450,
    minimumStock: 200,
    maximumStock: 1000,
    location: "Warehouse A-1",
    unitPrice: "₹12.50",
    status: "In Stock",
    lastUpdated: "2025-01-28"
  },
  {
    itemCode: "INV-0002", 
    itemName: "Steel Bolts M8x50",
    category: "Fasteners",
    currentStock: 85,
    minimumStock: 100,
    maximumStock: 500,
    location: "Warehouse B-2",
    unitPrice: "₹0.75",
    status: "Low Stock",
    lastUpdated: "2025-01-27"
  },
  {
    itemCode: "INV-0003",
    itemName: "Rubber Gaskets",
    category: "Sealing",
    currentStock: 0,
    minimumStock: 50,
    maximumStock: 300,
    location: "Warehouse C-1",
    unitPrice: "₹3.25",
    status: "Out of Stock",
    lastUpdated: "2025-01-26"
  },
  {
    itemCode: "INV-0004",
    itemName: "Electric Motors 5HP",
    category: "Components", 
    currentStock: 15,
    minimumStock: 10,
    maximumStock: 50,
    location: "Warehouse D-3",
    unitPrice: "₹450.00",
    status: "In Stock",
    lastUpdated: "2025-01-25"
  },
  {
    itemCode: "INV-0005",
    itemName: "Circuit Boards PCB-A1",
    category: "Electronics",
    currentStock: 75,
    minimumStock: 25,
    maximumStock: 200,
    location: "Warehouse E-1",
    unitPrice: "₹85.00",
    status: "In Stock",
    lastUpdated: "2025-01-24"
  },
  {
    itemCode: "INV-0015",
    itemName: "Titanium Screws",
    category: "Fasteners",
    currentStock: 0,
    minimumStock: 150,
    maximumStock: 600,
    location: "Warehouse B-3",
    unitPrice: "₹2.50",
    status: "Out of Stock",
    lastUpdated: "2025-01-14"
  }
];

// Streamlined to 7 orders that flow through the ERP system
export const customerOrders = [
  {
    id: 1,
    orderNumber: "CO-2025-001",
    customerName: "Luxury Home Interiors",
    productName: "Glass Dining Table",
    orderDate: "2025-01-15",
    deliveryDate: "2025-02-15",
    status: "Processing",
    totalValue: 85000,
    items: 1
  },
  {
    id: 2,
    orderNumber: "CO-2025-002", 
    customerName: "Corporate Office Solutions",
    productName: "Steel Office Desk",
    orderDate: "2025-01-18",
    deliveryDate: "2025-02-18",
    status: "Processing",
    totalValue: 45500, 
    items: 2
  },
  {
    id: 3,
    orderNumber: "CO-2025-003",
    customerName: "Metro Construction Ltd",
    productName: "Aluminum Window Frame",
    orderDate: "2025-01-20",
    deliveryDate: "2025-02-20", 
    status: "Processing",
    totalValue: 32750,
    items: 10
  },
  {
    id: 4,
    orderNumber: "CO-2025-004",
    customerName: "Precision Manufacturing",
    productName: "Motor Assembly Unit",
    orderDate: "2025-01-22", 
    deliveryDate: "2025-02-22",
    status: "Processing",
    totalValue: 125000,
    items: 5
  },
  {
    id: 5,
    orderNumber: "CO-2025-005",
    customerName: "Tech Solutions Inc",
    productName: "Circuit Board Assembly",
    orderDate: "2025-01-25",
    deliveryDate: "2025-02-25",
    status: "Processing", 
    totalValue: 78500,
    items: 8
  },
  {
    id: 6,
    orderNumber: "CO-2025-006",
    customerName: "Automotive Parts Ltd",
    productName: "Hydraulic System",
    orderDate: "2025-01-27",
    deliveryDate: "2025-02-27",
    status: "Processing",
    totalValue: 95000,
    items: 3
  },
  {
    id: 7,
    orderNumber: "CO-2025-007",
    customerName: "Energy Systems Corp",
    productName: "Solar Panel Frame",
    orderDate: "2025-01-29",
    deliveryDate: "2025-03-01",
    status: "Processing",
    totalValue: 52000,
    items: 20
  }
];

export const productionOrders = [
  { id: "WO-2025-001", product: "Widget A v3", status: "Completed", progress: 100 },
  { id: "WO-2025-002", product: "Gadget B v3", status: "In Progress", progress: 75 },
  { id: "WO-2025-003", product: "Component C v3", status: "Scheduled", progress: 0 },
  { id: "WO-2025-004", product: "Assembly D v3", status: "Delayed", progress: 45 },
  { id: "WO-2025-005", product: "Module E v3", status: "In Progress", progress: 85 },
];

// Calculate totals based on actual data
export const getInventoryStats = () => {
  const totalItems = inventoryData.length;
  const inStock = inventoryData.filter(item => item.status === "In Stock").length;
  const lowStock = inventoryData.filter(item => item.status === "Low Stock").length;
  const outOfStock = inventoryData.filter(item => item.status === "Out of Stock").length;

  return { totalItems, inStock, lowStock, outOfStock };
};

export const getOrderStats = () => {
  const totalOrders = customerOrders.length;
  const delivered = customerOrders.filter(order => order.status === "Delivered").length;
  const processing = customerOrders.filter(order => order.status === "Processing").length;
  const shipped = customerOrders.filter(order => order.status === "Shipped").length;
  const readyToShip = customerOrders.filter(order => order.status === "Ready to Ship").length;
  const inProgress = processing + shipped + readyToShip;
  const totalValue = customerOrders.reduce((sum, order) => sum + order.totalValue, 0);

  return { totalOrders, delivered, inProgress, totalValue };
};

// Material Requirements for all 7 orders
export const materialRequirementData = [
  // Order 1: Glass Dining Table (CO-2025-001) - Sufficient materials
  {
    materialCode: "MAT-001-A",
    materialName: "Aluminum Rods 6mm", 
    requiredQty: 10,
    availableQty: 450,
    shortfall: 0,
    supplier: "Aluminum Solutions Inc",
    leadTime: "3 days",
    status: "Available",
    plannedDate: "2025-01-20",
    relatedOrder: "CO-2025-001"
  },
  {
    materialCode: "MAT-001-B",
    materialName: "Steel Bolts M8x50",
    requiredQty: 20,
    availableQty: 85,
    shortfall: 0,
    supplier: "MetalCraft Industries",
    leadTime: "2 days",
    status: "Available",
    plannedDate: "2025-01-20",
    relatedOrder: "CO-2025-001"
  },
  
  // Order 2: Steel Office Desk (CO-2025-002) - Sufficient materials
  {
    materialCode: "MAT-002-A",
    materialName: "Aluminum Rods 6mm",
    requiredQty: 15,
    availableQty: 440,
    shortfall: 0,
    supplier: "Aluminum Solutions Inc",
    leadTime: "3 days",
    status: "Available",
    plannedDate: "2025-01-22",
    relatedOrder: "CO-2025-002"
  },
  {
    materialCode: "MAT-002-B",
    materialName: "Steel Bolts M8x50",
    requiredQty: 30,
    availableQty: 65,
    shortfall: 0,
    supplier: "MetalCraft Industries",
    leadTime: "2 days",
    status: "Available",
    plannedDate: "2025-01-22",
    relatedOrder: "CO-2025-002"
  },
  
  // Order 3: Aluminum Window Frame (CO-2025-003) - SHORTAGE (Rubber Gaskets)
  {
    materialCode: "MAT-003-A",
    materialName: "Aluminum Rods 6mm",
    requiredQty: 25,
    availableQty: 425,
    shortfall: 0,
    supplier: "Aluminum Solutions Inc",
    leadTime: "3 days",
    status: "Available",
    plannedDate: "2025-01-24",
    relatedOrder: "CO-2025-003"
  },
  {
    materialCode: "MAT-003-B",
    materialName: "Rubber Gaskets",
    requiredQty: 10,
    availableQty: 0,
    shortfall: 10,
    supplier: "Rubber Industries",
    leadTime: "5 days",
    status: "Required",
    plannedDate: "2025-01-24",
    relatedOrder: "CO-2025-003"
  },
  
  // Order 4: Motor Assembly Unit (CO-2025-004) - Sufficient materials
  {
    materialCode: "MAT-004-A",
    materialName: "Electric Motors 5HP",
    requiredQty: 1,
    availableQty: 15,
    shortfall: 0,
    supplier: "Precision Motors Ltd",
    leadTime: "7 days",
    status: "Available",
    plannedDate: "2025-01-26",
    relatedOrder: "CO-2025-004"
  },
  {
    materialCode: "MAT-004-B",
    materialName: "Circuit Boards PCB-A1",
    requiredQty: 2,
    availableQty: 75,
    shortfall: 0,
    supplier: "Electronics Supply Co",
    leadTime: "4 days",
    status: "Available",
    plannedDate: "2025-01-26",
    relatedOrder: "CO-2025-004"
  },
  
  // Order 5: Circuit Board Assembly (CO-2025-005) - Sufficient materials
  {
    materialCode: "MAT-005-A",
    materialName: "Circuit Boards PCB-A1",
    requiredQty: 5,
    availableQty: 73,
    shortfall: 0,
    supplier: "Electronics Supply Co",
    leadTime: "4 days",
    status: "Available",
    plannedDate: "2025-01-28",
    relatedOrder: "CO-2025-005"
  },
  
  // Order 6: Hydraulic System (CO-2025-006) - SHORTAGE (Steel Bolts & Motors)
  {
    materialCode: "MAT-006-A",
    materialName: "Steel Bolts M8x50",
    requiredQty: 40,
    availableQty: 35,
    shortfall: 5,
    supplier: "MetalCraft Industries",
    leadTime: "2 days",
    status: "Shortage",
    plannedDate: "2025-01-30",
    relatedOrder: "CO-2025-006"
  },
  {
    materialCode: "MAT-006-B",
    materialName: "Electric Motors 5HP",
    requiredQty: 2,
    availableQty: 14,
    shortfall: 0,
    supplier: "Precision Motors Ltd",
    leadTime: "7 days",
    status: "Available",
    plannedDate: "2025-01-30",
    relatedOrder: "CO-2025-006"
  },
  
  // Order 7: Solar Panel Frame (CO-2025-007) - SHORTAGE (Aluminum & Titanium Screws)
  {
    materialCode: "MAT-007-A",
    materialName: "Aluminum Rods 6mm",
    requiredQty: 30,
    availableQty: 400,
    shortfall: 0,
    supplier: "Aluminum Solutions Inc",
    leadTime: "3 days",
    status: "Available",
    plannedDate: "2025-02-01",
    relatedOrder: "CO-2025-007"
  },
  {
    materialCode: "MAT-007-B",
    materialName: "Titanium Screws",
    requiredQty: 20,
    availableQty: 0,
    shortfall: 20,
    supplier: "Titanium Tech Ltd",
    leadTime: "10 days",
    status: "Required",
    plannedDate: "2025-02-01",
    relatedOrder: "CO-2025-007"
  }
];

// Production Schedule for all 7 orders
export const productionScheduleData = [
  {
    scheduleId: "PS-2025-001",
    productName: "Glass Dining Table",
    orderNumber: "CO-2025-001",
    plannedStartDate: "2025-02-01",
    plannedEndDate: "2025-02-15",
    actualStartDate: "2025-02-01",
    actualEndDate: "",
    status: "In Progress",
    priority: "High",
    workstation: "Assembly Line A",
    supervisor: "John Smith",
    progress: 65
  },
  {
    scheduleId: "PS-2025-002",
    productName: "Steel Office Desk",
    orderNumber: "CO-2025-002",
    plannedStartDate: "2025-02-03",
    plannedEndDate: "2025-02-18",
    actualStartDate: "2025-02-03",
    actualEndDate: "",
    status: "In Progress",
    priority: "Medium",
    workstation: "Fabrication Bay B",
    supervisor: "Sarah Johnson",
    progress: 40
  },
  {
    scheduleId: "PS-2025-003",
    productName: "Aluminum Window Frame",
    orderNumber: "CO-2025-003",
    plannedStartDate: "2025-02-05",
    plannedEndDate: "2025-02-20",
    actualStartDate: "",
    actualEndDate: "",
    status: "On Hold",
    priority: "Medium",
    workstation: "Extrusion Line C",
    supervisor: "Mike Wilson",
    progress: 0
  },
  {
    scheduleId: "PS-2025-004",
    productName: "Motor Assembly Unit",
    orderNumber: "CO-2025-004",
    plannedStartDate: "2025-02-07",
    plannedEndDate: "2025-02-22",
    actualStartDate: "2025-02-07",
    actualEndDate: "",
    status: "Scheduled",
    priority: "High",
    workstation: "Motor Assembly D",
    supervisor: "Emily Davis",
    progress: 0
  },
  {
    scheduleId: "PS-2025-005",
    productName: "Circuit Board Assembly",
    orderNumber: "CO-2025-005",
    plannedStartDate: "2025-02-10",
    plannedEndDate: "2025-02-25",
    actualStartDate: "2025-02-10",
    actualEndDate: "",
    status: "In Progress",
    priority: "High",
    workstation: "Electronics Lab E",
    supervisor: "Robert Brown",
    progress: 25
  },
  {
    scheduleId: "PS-2025-006",
    productName: "Hydraulic System",
    orderNumber: "CO-2025-006",
    plannedStartDate: "2025-02-12",
    plannedEndDate: "2025-02-27",
    actualStartDate: "",
    actualEndDate: "",
    status: "On Hold",
    priority: "Medium",
    workstation: "Hydraulics Bay F",
    supervisor: "Lisa Chen",
    progress: 0
  },
  {
    scheduleId: "PS-2025-007",
    productName: "Solar Panel Frame",
    orderNumber: "CO-2025-007",
    plannedStartDate: "2025-02-14",
    plannedEndDate: "2025-03-01",
    actualStartDate: "",
    actualEndDate: "",
    status: "On Hold",
    priority: "Low",
    workstation: "Frame Assembly G",
    supervisor: "Tom Anderson",
    progress: 0
  }
];

// Extended Quality Control Data
export const qualityControlData = [
  {
    inspectionId: "QC-2025-001",
    productName: "Glass Dining Table",
    batchNumber: "GDT-001",
    inspectionDate: "2025-01-15",
    inspector: "John Smith",
    testType: "Dimensional Check",
    result: "Pass",
    defectCount: 0,
    notes: "All measurements within tolerance"
  },
  {
    inspectionId: "QC-2025-002",
    productName: "Steel Office Desk", 
    batchNumber: "SOD-002",
    inspectionDate: "2025-01-16",
    inspector: "Sarah Johnson",
    testType: "Functional Test",
    result: "Fail",
    defectCount: 3,
    notes: "Drawer mechanism needs adjustment"
  },
  {
    inspectionId: "QC-2025-003",
    productName: "Aluminum Window Frame",
    batchNumber: "AWF-003",
    inspectionDate: "2025-01-17",
    inspector: "Mike Wilson",
    testType: "Material Analysis",
    result: "Pass",
    defectCount: 0,
    notes: "Material composition verified"
  },
  {
    inspectionId: "QC-2025-004",
    productName: "Motor Assembly Unit",
    batchNumber: "MAU-004", 
    inspectionDate: "2025-01-18",
    inspector: "Emily Davis",
    testType: "Assembly Check",
    result: "Pending",
    defectCount: 0,
    notes: "Inspection in progress"
  },
  {
    inspectionId: "QC-2025-005",
    productName: "Circuit Board Assembly",
    batchNumber: "CBA-005",
    inspectionDate: "2025-01-19",
    inspector: "Robert Brown",
    testType: "Stress Test",
    result: "Warning", 
    defectCount: 1,
    notes: "Minor solder joint defect detected"
  },
  {
    inspectionId: "QC-2025-006",
    productName: "Hydraulic System",
    batchNumber: "HS-006",
    inspectionDate: "2025-01-20",
    inspector: "Lisa Chen",
    testType: "Pressure Test",
    result: "Pass",
    defectCount: 0,
    notes: "All pressure tests passed"
  },
  {
    inspectionId: "QC-2025-007",
    productName: "Solar Panel Frame",
    batchNumber: "SPF-007",
    inspectionDate: "2025-01-21",
    inspector: "Tom Anderson",
    testType: "Weather Resistance",
    result: "Pass",
    defectCount: 0,
    notes: "Weather resistance verified"
  },
  {
    inspectionId: "QC-2025-008",
    productName: "Glass Dining Table",
    batchNumber: "GDT-008",
    inspectionDate: "2025-01-22",
    inspector: "Alex Rodriguez",
    testType: "Stress Test",
    result: "Pass",
    defectCount: 0,
    notes: "Glass strength verified"
  },
  {
    inspectionId: "QC-2025-009",
    productName: "Steel Office Desk",
    batchNumber: "SOD-009",
    inspectionDate: "2025-01-23",
    inspector: "Maria Garcia",
    testType: "Dimensional Check",
    result: "Warning",
    defectCount: 1,
    notes: "Minor dimensional variance on leg"
  },
  {
    inspectionId: "QC-2025-010",
    productName: "Aluminum Window Frame",
    batchNumber: "AWF-010",
    inspectionDate: "2025-01-24",
    inspector: "David Kim",
    testType: "Functional Test",
    result: "Pass",
    defectCount: 0,
    notes: "All functions working correctly"
  }
];

// Extended Logistics Data
export const logisticsData = [
  {
    shipmentId: "SH-2025-001",
    orderNumber: "CO-2025-001",
    carrier: "FedEx Express",
    trackingNumber: "1234567890",
    origin: "Warehouse A",
    destination: "New York, NY",
    departureDate: "2025-01-15",
    estimatedArrival: "2025-01-17",
    status: "In Transit",
    priority: "High"
  },
  {
    shipmentId: "SH-2025-002",
    orderNumber: "CO-2025-002", 
    carrier: "UPS Ground",
    trackingNumber: "1Z9876543210",
    origin: "Warehouse B",
    destination: "Los Angeles, CA",
    departureDate: "2025-01-16",
    estimatedArrival: "2025-01-19", 
    status: "Delivered",
    priority: "Medium"
  },
  {
    shipmentId: "SH-2025-003",
    orderNumber: "CO-2025-003",
    carrier: "DHL International",
    trackingNumber: "DHL123456789",
    origin: "Warehouse C",
    destination: "Chicago, IL", 
    departureDate: "2025-01-18",
    estimatedArrival: "2025-01-20",
    status: "Preparing",
    priority: "Low"
  },
  {
    shipmentId: "SH-2025-004",
    orderNumber: "CO-2025-004",
    carrier: "USPS Priority",
    trackingNumber: "USPS987654321",
    origin: "Warehouse A",
    destination: "Houston, TX",
    departureDate: "2025-01-20",
    estimatedArrival: "2025-01-22",
    status: "Delayed",
    priority: "High"
  },
  {
    shipmentId: "SH-2025-005",
    orderNumber: "CO-2025-005",
    carrier: "FedEx Ground", 
    trackingNumber: "FDX555444333",
    origin: "Warehouse D",
    destination: "Miami, FL",
    departureDate: "2025-01-22",
    estimatedArrival: "2025-01-24",
    status: "In Transit",
    priority: "Medium"
  },
  {
    shipmentId: "SH-2025-006",
    orderNumber: "CO-2025-006",
    carrier: "DHL Express",
    trackingNumber: "DHL987654321",
    origin: "Warehouse E",
    destination: "Seattle, WA",
    departureDate: "2025-01-24",
    estimatedArrival: "2025-01-26",
    status: "In Transit",
    priority: "High"
  },
  {
    shipmentId: "SH-2025-007",
    orderNumber: "CO-2025-007",
    carrier: "UPS Express",
    trackingNumber: "1Z1234567890",
    origin: "Warehouse F",
    destination: "Boston, MA",
    departureDate: "2025-01-25",
    estimatedArrival: "2025-01-27",
    status: "Delivered",
    priority: "Medium"
  },
  {
    shipmentId: "SH-2025-008",
    orderNumber: "CO-2025-008",
    carrier: "FedEx International",
    trackingNumber: "FDX111222333",
    origin: "Warehouse G",
    destination: "Denver, CO",
    departureDate: "2025-01-26",
    estimatedArrival: "2025-01-28",
    status: "In Transit",
    priority: "Low"
  },
  {
    shipmentId: "SH-2025-009",
    orderNumber: "CO-2025-009",
    carrier: "USPS Express",
    trackingNumber: "USPS555666777",
    origin: "Warehouse H",
    destination: "Phoenix, AZ",
    departureDate: "2025-01-27",
    estimatedArrival: "2025-01-29",
    status: "Preparing",
    priority: "Medium"
  },
  {
    shipmentId: "SH-2025-010",
    orderNumber: "CO-2025-010",
    carrier: "DHL Ground",
    trackingNumber: "DHL444555666",
    origin: "Warehouse I",
    destination: "Atlanta, GA",
    departureDate: "2025-01-28",
    estimatedArrival: "2025-01-30",
    status: "Delayed",
    priority: "High"
  }
];

// Calculate stats for various pages
export const getMRPStats = () => {
  const totalItems = materialRequirementData.length;
  const available = materialRequirementData.filter(item => item.status === "Available").length;
  const shortage = materialRequirementData.filter(item => item.status === "Shortage").length;
  const required = materialRequirementData.filter(item => item.status === "Required").length;
  const ordered = materialRequirementData.filter(item => item.status === "Ordered").length;
  
  return { totalItems, available, shortage, required, ordered };
};

export const getProductionStats = () => {
  const totalSchedules = productionScheduleData.length;
  const completed = productionScheduleData.filter(item => item.status === "Completed").length;
  const inProgress = productionScheduleData.filter(item => item.status === "In Progress").length;
  const scheduled = productionScheduleData.filter(item => item.status === "Scheduled").length;
  const delayed = productionScheduleData.filter(item => item.status === "Delayed").length;
  const onHold = productionScheduleData.filter(item => item.status === "On Hold").length;
  
  return { totalSchedules, completed, inProgress, scheduled, delayed, onHold };
};

export const getQualityStats = () => {
  const totalInspections = qualityControlData.length;
  const passed = qualityControlData.filter(item => item.result === "Pass").length;
  const failed = qualityControlData.filter(item => item.result === "Fail").length;
  const pending = qualityControlData.filter(item => item.result === "Pending").length;
  const warning = qualityControlData.filter(item => item.result === "Warning").length;
  
  return { totalInspections, passed, failed, pending, warning };
};

export const getLogisticsStats = () => {
  const totalShipments = logisticsData.length;
  const delivered = logisticsData.filter(item => item.status === "Delivered").length;
  const inTransit = logisticsData.filter(item => item.status === "In Transit").length;
  const preparing = logisticsData.filter(item => item.status === "Preparing").length;
  const delayed = logisticsData.filter(item => item.status === "Delayed").length;
  
  return { totalShipments, delivered, inTransit, preparing, delayed };
};

// Procurement Orders for material shortages from orders 3, 6, 7
export const procurementData = [
  {
    poNumber: "PO-2025-001",
    supplier: "Rubber Industries",
    materialName: "Rubber Gaskets",
    itemCode: "INV-0003",
    quantity: 50,
    unitPrice: "₹3.25",
    totalAmount: "₹162.50",
    orderDate: "2025-01-24",
    expectedDelivery: "2025-01-31",
    status: "Ordered",
    relatedOrder: "CO-2025-003"
  },
  {
    poNumber: "PO-2025-002",
    supplier: "MetalCraft Industries",
    materialName: "Steel Bolts M8x50",
    itemCode: "INV-0002",
    quantity: 100,
    unitPrice: "₹0.75",
    totalAmount: "₹75.00",
    orderDate: "2025-01-30",
    expectedDelivery: "2025-02-03",
    status: "Approved",
    relatedOrder: "CO-2025-006"
  },
  {
    poNumber: "PO-2025-003",
    supplier: "Titanium Tech Ltd",
    materialName: "Titanium Screws",
    itemCode: "INV-0015",
    quantity: 200,
    unitPrice: "₹2.50",
    totalAmount: "₹500.00",
    orderDate: "2025-02-01",
    expectedDelivery: "2025-02-13",
    status: "Pending",
    relatedOrder: "CO-2025-007"
  }
];

export const getProcurementStats = () => {
  const totalPOs = procurementData.length;
  const pending = procurementData.filter(item => item.status === "Pending").length;
  const approved = procurementData.filter(item => item.status === "Approved").length;
  const inTransit = procurementData.filter(item => item.status === "In Transit").length;
  const delivered = procurementData.filter(item => item.status === "Delivered").length;
  
  return { totalPOs, pending, approved, inTransit, delivered };
};

// Product-Material Mapping: Links products to their required materials and quantities
export const productMaterialMapping: Record<string, Array<{ itemCode: string; itemName: string; quantity: number }>> = {
  "Glass Dining Table": [
    { itemCode: "INV-0001", itemName: "Aluminum Rods 6mm", quantity: 10 },
    { itemCode: "INV-0002", itemName: "Steel Bolts M8x50", quantity: 20 }
  ],
  "Steel Office Desk": [
    { itemCode: "INV-0001", itemName: "Aluminum Rods 6mm", quantity: 15 },
    { itemCode: "INV-0002", itemName: "Steel Bolts M8x50", quantity: 30 }
  ],
  "Aluminum Window Frame": [
    { itemCode: "INV-0001", itemName: "Aluminum Rods 6mm", quantity: 25 },
    { itemCode: "INV-0003", itemName: "Rubber Gaskets", quantity: 10 }
  ],
  "Motor Assembly Unit": [
    { itemCode: "INV-0004", itemName: "Electric Motors 5HP", quantity: 1 },
    { itemCode: "INV-0005", itemName: "Circuit Boards PCB-A1", quantity: 2 }
  ],
  "Circuit Board Assembly": [
    { itemCode: "INV-0005", itemName: "Circuit Boards PCB-A1", quantity: 5 }
  ],
  "Hydraulic System": [
    { itemCode: "INV-0002", itemName: "Steel Bolts M8x50", quantity: 40 },
    { itemCode: "INV-0004", itemName: "Electric Motors 5HP", quantity: 2 }
  ],
  "Solar Panel Frame": [
    { itemCode: "INV-0001", itemName: "Aluminum Rods 6mm", quantity: 30 },
    { itemCode: "INV-0015", itemName: "Titanium Screws", quantity: 20 }
  ]
};

export const getDashboardStats = () => {
  const orderStats = getOrderStats();
  const inventoryStats = getInventoryStats();
  const procurementStats = getProcurementStats();
  
  // Calculate material requirements based on actual data
  const totalRequired = materialRequirementData.reduce((sum, item) => sum + item.requiredQty, 0);
  const availableStock = materialRequirementData.reduce((sum, item) => sum + item.availableQty, 0);
  const shortfall = materialRequirementData.reduce((sum, item) => sum + item.shortfall, 0);
  const itemsInShortage = materialRequirementData.filter(item => item.shortfall > 0).length;

  return {
    totalProductionOrders: productionScheduleData.length,
    activePurchaseOrders: procurementStats.totalPOs,
    materialShortfall: shortfall,
    monthlyRevenue: orderStats.totalValue,
    totalRequired,
    availableStock,
    shortfall,
    itemsInShortage
  };
};