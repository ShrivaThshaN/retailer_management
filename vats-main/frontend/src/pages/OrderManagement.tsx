import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Download, Edit, Trash2 } from "lucide-react";

import { PaginationComponent } from "@/components/Pagination";
import { EditOrderDialog } from "@/components/EditOrderDialog";
import { NewOrderDialog } from "@/components/NewOrderDialog";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";


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


const API_URL = "http://localhost:5001/api/customer-orders";



const OrderManagement = () => {
    // --- API-driven state ---
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // --- Local state ---
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [editOrder, setEditOrder] = useState<Order | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
    const [nextOrderNumber, setNextOrderNumber] = useState(""); 
    
    const itemsPerPage = 10;
    const { user } = useUser();
    const { toast } = useToast();
    const isAdmin = user.role === 'admin';
    
    // --- Data Fetching ---
    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || errData.error || "Failed to fetch orders");
            }
            const data = await response.json();
            setOrders(Array.isArray(data) ? (data as Order[]) : []);
        } catch (e: any) {
            console.error("Failed to fetch orders:", e);
            setError(`Failed to load orders: ${e.message}`);
            toast({ title: "Error Loading Data", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    // Fetch data on component mount
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // --- Order Number Generation (still client-side for form pre-fill) ---
    const generateNextOrderNumber = useCallback(() => {
        const orderNumbers = orders
            .map(order => order.orderNumber)
            .filter(num => num.startsWith("CO-"))
            .map(num => parseInt(num.split('-').pop() || '0', 10))
            .filter(num => !isNaN(num));

        const maxNumber = orderNumbers.length > 0 ? Math.max(...orderNumbers) : 0;
        const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
        const year = new Date().getFullYear();
        
        return `CO-${year}-${nextNumber}`;
    }, [orders]); // Relies on fetched orders state

    const openNewOrderDialog = () => {
        setNextOrderNumber(generateNextOrderNumber());
        setIsNewOrderOpen(true);
    };

    // --- Stats (calculated from API data) ---
    const stats = {
        totalOrders: orders.length,
        delivered: orders.filter(o => o.status === "Delivered").length,
        inProgress: orders.filter(o => o.status === "Processing" || o.status === "Shipped" || o.status === "Ready to Ship").length,
        totalValue: orders.reduce((sum, o) => sum + o.totalValue, 0),
    };

    // --- Filtering (client-side) ---
    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || order.status === "all" || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

    
    // --- NEW: CSV Export Logic ---
    const convertToCSV = (data: Order[]) => {
        const headers = [
            "ID", "Order Number", "Customer Name", "Product Name", 
            "Order Date", "Delivery Date", "Items", "Total Value", "Status"
        ];
        
        // Define the keys from the Order interface that correspond to the headers
        const keys: (keyof Order)[] = [
            "id", "orderNumber", "customerName", "productName", 
            "orderDate", "deliveryDate", "items", "totalValue", "status"
        ];

        // 1. Generate Header Row
        const headerRow = headers.join(',') + '\n';

        // 2. Generate Data Rows
        const dataRows = data.map(order => 
            keys.map(key => {
                let value = order[key];
                // Escape logic for CSV: handle commas, newlines, and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                } else if (typeof value === 'number') {
                    // Format currency value with the Rupee symbol and two decimal places
                    value = key === 'totalValue' 
                        ? `₹${value.toFixed(2)}` 
                        : String(value);
                } else if (value === null || value === undefined) {
                    value = '';
                } else {
                    value = String(value);
                }
                return value;
            }).join(',')
        ).join('\n');

        return headerRow + dataRows;
    };
    
    const handleDownload = () => {
        if (filteredOrders.length === 0) {
            toast({
                title: "Download Failed",
                description: "No orders match the current filters to download.",
                variant: "destructive",
            });
            return;
        }

        const csvString = convertToCSV(filteredOrders);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        // Use current date for filename
        const filename = `Customer_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute('download', filename);
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Download Complete",
            description: `${filteredOrders.length} orders exported to ${filename}.`,
        });
    };
    
    // --- CRUD Handlers (API-driven - Remains intact) ---
    const handleEditOrder = (order: Order) => {
        setEditOrder(order);
        setIsEditOpen(true);
    };

    const handleSaveOrder = async (updatedOrder: Order) => {
        try {
            const response = await fetch(`${API_URL}/${updatedOrder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedOrder), // Send camelCase, backend handles it
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            const savedOrder = await response.json(); // Get updated order from backend
            setOrders(prevOrders => prevOrders.map(order => 
                order.id === savedOrder.id ? savedOrder : order
            ));
            toast({
                title: "Order Updated",
                description: `Order ${savedOrder.orderNumber} has been updated successfully.`,
            });
            setIsEditOpen(false); // Close dialog on success
        } catch (e: any) {
            console.error("Failed to save order:", e);
            toast({ title: "Error Saving", description: e.message, variant: "destructive" });
        }
    };

    const handleDeleteOrder = async (orderId: number) => {
        const orderToDelete = orders.find(order => order.id === orderId);
        if (!orderToDelete) return;

        try {
            const response = await fetch(`${API_URL}/${orderId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
            toast({
                title: "Order Deleted",
                description: `Order ${orderToDelete.orderNumber} has been deleted.`,
                variant: "destructive",
            });
        } catch (e: any) {
             console.error("Failed to delete order:", e);
             toast({ title: "Error Deleting", description: e.message, variant: "destructive" });
        }
    };

    

    const handleNewOrder = async (newOrderData: Omit<Order, 'id'>) => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrderData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const addedOrder = await response.json(); // Get new order with DB-generated ID
            setOrders(prevOrders => [addedOrder,...prevOrders ]); // Add to state
            
            toast({
                title: "Order Created",
                description: `Order ${addedOrder.orderNumber} has been created successfully.`,
            });
            setIsNewOrderOpen(false); // Close dialog
        } catch (e: any) {
            console.error("Failed to add order:", e);
            toast({ title: "Error Adding", description: e.message, variant: "destructive" });
        }
    };

    // --- Badge Helper (Remains intact) ---
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Delivered": return <Badge className="bg-status-completed text-white">Delivered</Badge>;
            case "Shipped": return <Badge className="bg-primary text-white">Shipped</Badge>;
            case "Ready to Ship": return <Badge className="bg-erp-info text-white">Ready to Ship</Badge>;
            case "Processing": return <Badge className="bg-status-progress text-white">Processing</Badge>;
            case "Cancelled": return <Badge className="bg-status-delayed text-white">Cancelled</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    

    // --- Render Logic (Remains intact, except for Download button) ---
    if (isLoading) { return <div className="p-6 text-center text-muted-foreground">Loading Orders...</div>; }
    if (error) { return <div className="p-6 text-center text-red-600">Error: {error}</div>; }


    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
                    <p className="text-muted-foreground">Track and manage customer orders and fulfillment</p>
                </div>
                <div className="flex space-x-2">
                    <Dialog>
                        {/* ... Filter Dialog ... */}
                    </Dialog>
                    {/* ⭐ MODIFIED: Updated onClick to call handleDownload and added disabled state */}
                    <Button 
                        variant="outline" 
                        onClick={handleDownload} 
                        disabled={filteredOrders.length === 0}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button 
                        className="bg-primary hover:bg-primary/90"
                        onClick={openNewOrderDialog}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Order
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                        <div className="text-sm text-muted-foreground">Total Orders</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-erp-success">{stats.delivered}</div>
                        <div className="text-sm text-muted-foreground">Delivered</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-status-progress">{stats.inProgress}</div>
                        <div className="text-sm text-muted-foreground">In Progress</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        {/* Replaced encoding error '竄ｹ' with '₹' for Rupees */}
                        <div className="text-2xl font-bold">₹{(stats.totalValue / 100000).toFixed(1)}L</div>
                        <div className="text-sm text-muted-foreground">Total Value</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Orders</CardTitle>
                    <p className="text-sm text-muted-foreground">View and manage all customer orders</p>
                </CardHeader>
                <CardContent>
                    <div className="relative flex-1 max-w-sm mb-6">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order Number</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Order Date</TableHead>
                                    <TableHead>Delivery Date</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    {isAdmin && <TableHead>Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedOrders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 9 : 8} className="h-24 text-center">
                                            No orders found.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {paginatedOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell className="font-medium text-primary">{order.productName}</TableCell>
                                        <TableCell>{new Date(order.orderDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</TableCell>
                                        <TableCell>{new Date(order.deliveryDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</TableCell>
                                        <TableCell>{order.items}</TableCell>
                                        {/* Replaced encoding error '竄ｹ' with '₹' for Rupees */}
                                        <TableCell className="font-medium">₹{order.totalValue.toLocaleString()}</TableCell>
                                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                                        {isAdmin && (
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditOrder(order)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    
                    <div className="mt-4 flex justify-center">
                        <PaginationComponent
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </CardContent>
            </Card>

            <EditOrderDialog
                order={editOrder}
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSave={handleSaveOrder}
            />

            <NewOrderDialog
                isOpen={isNewOrderOpen}
                onClose={() => setIsNewOrderOpen(false)}
                onSave={handleNewOrder}
                initialOrderNumber={nextOrderNumber}
            />
        </div>
    );
};

export default OrderManagement;
