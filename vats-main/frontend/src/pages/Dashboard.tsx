import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  Clock,
  CheckCircle,
  DollarSign
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// --- API Endpoints ---
const API_ORDERS_URL = "http://localhost:5001/api/customer-orders";
const API_MPS_URL = "http://localhost:5001/api/mps";
const API_MRP_URL = "http://localhost:5001/api/mrp";
const API_INVENTORY_URL = "http://localhost:5001/api/inventory";

// --- Data Interfaces (from your other files) ---
interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  productName: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
  totalValue: number;
  items: number;
}

interface Schedule {
  schedule_id: string;
  product_name: string;
  order_number: string;
  planned_start_date: string;
  planned_end_date: string;
  status: string;
  // ... other fields
}

interface MRPItem {
  material_code: string;
  material_name: string;
  item_code: string;
  required_qty: number;
  available_qty: number;
  shortfall: number;
  status: string;
  // ... other fields
}

interface InventoryItem {
  item_code: string;
  item_name: string;
  current_stock: number;
  // ... other fields
}

const Dashboard = () => {
  // --- State for Fetched Data ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [mrpItems, setMrpItems] = useState<MRPItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching Logic ---
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ordersRes, mpsRes, mrpRes, inventoryRes] = await Promise.all([
        fetch(API_ORDERS_URL),
        fetch(API_MPS_URL),
        fetch(API_MRP_URL),
        fetch(API_INVENTORY_URL)
      ]);

      if (!ordersRes.ok) throw new Error("Failed to fetch customer orders");
      if (!mpsRes.ok) throw new Error("Failed to fetch production schedules");
      if (!mrpRes.ok) throw new Error("Failed to fetch material requirements");
      if (!inventoryRes.ok) throw new Error("Failed to fetch inventory");

      const ordersData = await ordersRes.json();
      const mpsData = await mpsRes.json();
      const mrpData = await mrpRes.json();
      const inventoryData = await inventoryRes.json();

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setSchedules(Array.isArray(mpsData) ? mpsData : []);
      setMrpItems(Array.isArray(mrpData) ? mrpData : []);
      setInventoryItems(Array.isArray(inventoryData) ? inventoryData : []);

    } catch (e: any) {
      console.error("Failed to fetch dashboard data:", e);
      setError(e.message);
      toast({ title: "Error Loading Dashboard", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  
  // --- Loading and Error State ---
  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading Dashboard Data...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-600">Error loading dashboard: {error}</div>;
  }

  
  // --- Live Data Calculations ---

  // 1. Get recent production schedules
  const recentSchedules = [...schedules]
    .sort((a, b) => new Date(b.planned_start_date).getTime() - new Date(a.planned_start_date).getTime())
    .slice(0, 5);
  
  // 2. Calculate real-time material overview
  const materialOverview = {
    totalRequired: mrpItems.reduce((sum, item) => sum + item.required_qty, 0),
    availableStock: inventoryItems.reduce((sum, item) => sum + item.current_stock, 0),
    shortfall: mrpItems.reduce((sum, item) => sum + item.shortfall, 0),
    itemsInShortage: mrpItems.filter(item => item.shortfall > 0).length
  };

  // 3. Calculate KPI card stats
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  
  const monthlyRevenue = orders
    .filter(order => {
        // Fix: Parse YYYY-MM-DD string correctly as UTC
        const orderDateParts = order.orderDate.split('-').map(Number);
        const orderDate = new Date(Date.UTC(orderDateParts[0], orderDateParts[1] - 1, orderDateParts[2]));

        const isShippedOrDelivered = order.status === 'Shipped' || order.status === 'Delivered';
        
        // Check if the order's month and year match the current month and year
        const isThisMonth = orderDate.getUTCFullYear() === today.getFullYear() &&
                            orderDate.getUTCMonth() === today.getMonth();

        return isShippedOrDelivered && isThisMonth;
    })
    .reduce((sum, order) => sum + order.totalValue, 0);
  // --- END OF UPDATE ---
  // --- END OF UPDATE ---

  const activePurchaseOrders = mrpItems.filter(item => item.status === 'Ordered' || item.status === 'Required').length;

  const kpiData = [
    {
      title: "Total Production Orders",
      value: schedules.length.toString(),
      // Placeholder
      changeType: "increase" as const,
      icon: Package,
      color: "text-erp-info"
    },
    {
      title: "Active Purchase Orders",
      value: activePurchaseOrders.toString(),
       // Placeholder
      changeType: "increase" as const,
      icon: ShoppingCart,
      color: "text-erp-success"
    },
    {
      title: "Material Shortfall",
      value: materialOverview.shortfall.toLocaleString(),
       // Placeholder
      changeType: "decrease" as const,
      icon: AlertTriangle,
      color: "text-erp-danger"
    },
    {
      title: "Revenue (Monthly)",
      value: `₹${(monthlyRevenue / 100000).toFixed(1)}L`, // Uses the new calculation
       // Placeholder
      changeType: "increase" as const,
      icon: DollarSign,
      color: "text-erp-success"
    },
  ];

  // --- Helper Function (Unchanged) ---
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-status-completed text-white">Completed</Badge>;
      case "In Progress":
        return <Badge className="bg-status-progress text-white">In Progress</Badge>;
      case "Scheduled":
        return <Badge className="bg-status-pending text-white">Scheduled</Badge>;
      case "Delayed":
        return <Badge className="bg-status-delayed text-white">Delayed</Badge>;
      case "On Hold":
        return <Badge className="bg-yellow-500 text-white">On Hold</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // --- JSX (Render) ---
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Enterprise Resource Planning Overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className={`text-xs ${
                  kpi.changeType === 'increase' ? 'text-erp-success' : 'text-erp-danger'
                }`}>
                  {} 
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Production Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Production Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSchedules.length === 0 && (
                <p className="text-muted-foreground text-center">No production schedules found.</p>
              )}
              {recentSchedules.map((schedule) => (
                <div key={schedule.schedule_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{schedule.schedule_id}</p>
                    <p className="text-sm text-muted-foreground">{schedule.product_name}</p>
                  </div>
                  {getStatusBadge(schedule.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Material Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Material Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Total Required</p>
                  <p className="text-2xl font-bold text-foreground">{materialOverview.totalRequired.toLocaleString()}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Available Stock</p>
                  <p className="text-2xl font-bold text-erp-success">{materialOverview.availableStock.toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-erp-success" />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Shortfall</p>
                  <p className="text-2xl font-bold text-erp-danger">{materialOverview.shortfall.toLocaleString()}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-erp-danger" />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Items in Shortage</p>
                  <p className="text-2xl font-bold text-erp-warning">{materialOverview.itemsInShortage}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-erp-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;