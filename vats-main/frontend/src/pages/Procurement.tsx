import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, Search, Filter, Edit, Trash2 } from "lucide-react";
import { PaginationComponent } from "@/components/Pagination";
import { useUser } from "@/contexts/UserContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewPurchaseOrderDialog, NewPOData } from "@/components/NewPurchaseOrderDialog";
import { EditPurchaseOrderDialog, ProcurementOrder } from "@/components/EditPurchaseOrderDialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface InventoryItem {
    item_code: string;
    item_name: string;
    category: string | null;
    current_stock: number;
    minimum_stock: number | null;
    maximum_stock: number | null;
    location: string | null;
    unit_price: string | null;
    status: string | null;
    last_updated: string | null;
}

const API_URL = "http://localhost:5001/api/procurement";
const API_INVENTORY_URL = "http://localhost:5001/api/inventory";

const getStatusColor = (status: string | null) => {
    const statusStr = status || 'N/A';
    switch (statusStr) {
        case "Received":
        case "Delivered":
            return "bg-status-completed";
        case "Pending":
        case "Ordered":
            return "bg-status-pending";
        case "Approved":
            return "bg-status-progress";
        default:
            return "bg-secondary";
    }
};

const Procurement = () => {
    const { user } = useUser();
    const [procurementData, setProcurementData] = useState<ProcurementOrder[]>([]);
    const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<ProcurementOrder | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    const [nextPoNumber, setNextPoNumber] = useState("");

    const fetchApiData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const cacheBuster = `?t=${new Date().getTime()}`;
            const [procResponse, invResponse] = await Promise.all([
                fetch(API_URL + cacheBuster),
                fetch(API_INVENTORY_URL + cacheBuster)
            ]);

            if (!procResponse.ok) {
                const errData = await procResponse.json();
                throw new Error(errData.message || errData.error || "Failed to fetch procurement orders");
            }
            if (!invResponse.ok) {
                const errData = await invResponse.json();
                throw new Error(errData.message || errData.error || "Failed to fetch inventory data");
            }

            const procData = await procResponse.json();
            const invData = await invResponse.json();

            setProcurementData(Array.isArray(procData) ? procData as ProcurementOrder[] : []);
            setInventoryData(Array.isArray(invData) ? invData as InventoryItem[] : []);

        } catch (e: any) {
            console.error("Failed to fetch data:", e);
            setError(`Failed to load data: ${e.message}`);
            toast({ title: "Error Loading Data", description: e.message, variant: "destructive" });
            setProcurementData([]);
            setInventoryData([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast]); // Added toast dependency

    useEffect(() => {
        fetchApiData();
    }, [fetchApiData]);

    const generateNextPoNumber = useCallback(() => {
        const poNumbers = procurementData
            .map(order => order.po_number)
            .filter(po => po?.startsWith("PO-"))
            .map(po => {
                const parts = po.split('-');
                const numIndex = parts.length === 3 ? 2 : (parts.length > 1 ? parts.length - 1 : -1);
                return numIndex !== -1 ? parseInt(parts[numIndex], 10) : NaN;
            })
            .filter(num => !isNaN(num));
        const maxNumber = poNumbers.length > 0 ? Math.max(0, ...poNumbers) : 0;
        const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
        const year = new Date().getFullYear();
        return `PO-${year}-${nextNumber}`;
    }, [procurementData]);

    const openAddDialog = () => {
        setNextPoNumber(generateNextPoNumber());
        setIsAddDialogOpen(true);
    };

    const uniqueStatuses = Array.from(new Set(procurementData.map(order => order.status))).filter(Boolean).sort();
    const uniqueVendors = Array.from(new Set(procurementData.map(order => order.supplier))).filter(Boolean).sort();

    const filteredOrders = procurementData.filter(order => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (order.po_number?.toLowerCase() || '').includes(term) ||
            (order.supplier?.toLowerCase() || '').includes(term) ||
            (order.material_name?.toLowerCase() || '').includes(term) ||
            (order.item_code?.toLowerCase() || '').includes(term);
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
        const matchesVendor = selectedVendors.length === 0 || selectedVendors.includes(order.supplier ?? '');
        return matchesSearch && matchesStatus && matchesVendor;
    });

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

     const stats = isLoading ? { totalPOs: 0, pending: 0, approved: 0, received: 0 } : {
        totalPOs: procurementData.length,
        pending: procurementData.filter(item => item.status === "Pending").length,
        approved: procurementData.filter(item => item.status === "Approved").length,
        received: procurementData.filter(item => item.status === "Received" || item.status === "Delivered").length,
     };
     const totalValue = procurementData.reduce((sum, order) => {
        const amountString = String(order.total_amount || '0').replace(/[₹,]/g, '');
        const amount = parseFloat(amountString);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const handleEdit = (order: ProcurementOrder) => { setSelectedOrder(order); setIsEditDialogOpen(true); };
    const handleDelete = (orderId: string) => { setOrderToDelete(orderId); setIsDeleteDialogOpen(true); };

    const confirmDelete = async () => {
        if (!orderToDelete) return;
        try {
            const response = await fetch(`${API_URL}/${orderToDelete}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }
            setProcurementData(prevData => prevData.filter(po => po.po_number !== orderToDelete));
            toast({ title: "Success", description: `Purchase order ${orderToDelete} deleted.` });
        } catch (e: any) {
            toast({ title: "Error Deleting", description: e.message, variant: "destructive" });
        } finally {
            setIsDeleteDialogOpen(false);
            setOrderToDelete(null);
        }
    };

    const handleOrderAdded = async (newOrderData: NewPOData) => {
        const inventoryItem = inventoryData.find(inv =>
            inv.item_name.toLowerCase().trim() === newOrderData.material_name.toLowerCase().trim()
        );
        const payload = {
            po_number: newOrderData.po_number,
            supplier: newOrderData.supplier,
            material_name: newOrderData.material_name,
            item_code: inventoryItem ? inventoryItem.item_code : "N/A",
            quantity: newOrderData.quantity,
            unit_price: `₹${newOrderData.unit_price.toFixed(2)}`,
            total_amount: `₹${newOrderData.total_amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
            order_date: format(new Date(), "yyyy-MM-dd"),
            expected_delivery: format(newOrderData.expected_delivery, "yyyy-MM-dd"),
            status: newOrderData.status,
            related_order: null
        };
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }
            const addedOrder = await response.json();
            setProcurementData(prevData => [addedOrder, ...prevData]);
            toast({ title: "Success", description: `Purchase order ${addedOrder.po_number} created.` });
            setIsAddDialogOpen(false);
        } catch (e: any) {
            console.error("Failed to add PO:", e);
            toast({ title: "Error Adding", description: e.message, variant: "destructive" });
        }
    };

    const handleOrderUpdated = async (updatedOrder: ProcurementOrder) => {
        try {
            if (!updatedOrder?.po_number) throw new Error("PO Number missing.");
            const response = await fetch(`${API_URL}/${updatedOrder.po_number}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedOrder),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }
            const savedOrderResponse = await response.json();
            setProcurementData(prevData =>
                prevData.map(o => (o.po_number === savedOrderResponse.order.po_number ? savedOrderResponse.order : o))
            );
             if (savedOrderResponse.message) {
                 toast({ title: savedOrderResponse.message.includes("Inventory") ? "Success" : "Order Updated", description: savedOrderResponse.message });
             } else {
                 toast({ title: "Updated", description: `Purchase order ${savedOrderResponse.order.po_number} updated.` });
             }
            setIsEditDialogOpen(false);
            setSelectedOrder(null);
        } catch (e: any) {
            console.error("Failed to update PO:", e);
            toast({ title: "Error Updating", description: e.message, variant: "destructive" });
        }
    };

    const handleExport = () => {
        if (!filteredOrders || filteredOrders.length === 0) {
            toast({ title: "Export Failed", description: "No data available to export.", variant: "destructive"});
            return;
        }

        const headers = ["PO ID", "Vendor", "Material", "Item Code", "Quantity", "Unit Price", "Total Amount", "Delivery Date", "Status"];

        const formatCSVField = (field: any): string => {
            const value = field === null || field === undefined ? '' : String(field);
            // Remove currency symbols and commas for numeric fields if needed, or handle formatting here
            // Example: Keep currency symbols but handle commas inside quotes
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const csvContent = [
            headers.map(formatCSVField).join(","),
            ...filteredOrders.map(order => [
                order.po_number,
                order.supplier,
                order.material_name,
                order.item_code,
                order.quantity,
                order.unit_price, // Keep currency/commas, handled by formatCSVField
                order.total_amount, // Keep currency/commas, handled by formatCSVField
                order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : 'N/A', // Format date
                order.status
            ].map(formatCSVField).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "procurement_orders.csv";
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) { return <div className="p-6 text-center text-muted-foreground">Loading Procurement Data...</div>; }
    if (error && procurementData.length === 0) { return <div className="p-6 text-center text-red-600">Error: {error}</div>; }


    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                 <div>
                    <h1 className="text-3xl font-bold text-foreground">Procurement</h1>
                    <p className="text-muted-foreground">Manage purchase orders and vendor relationships</p>
                </div>
                <div className="flex space-x-2">
                    <Dialog>
                        <DialogTrigger asChild><Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Filter Purchase Orders</DialogTitle>
                                <DialogDescription>Filter orders by status or vendor.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="filter-status-po">Status</Label>
                                    <Select value={selectedStatuses.join(',')} onValueChange={(value) => setSelectedStatuses(value === 'all' ? [] : value.split(','))}>
                                        <SelectTrigger id="filter-status-po"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            {uniqueStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="filter-vendor-po">Vendor</Label>
                                    <Select value={selectedVendors.join(',')} onValueChange={(value) => setSelectedVendors(value === 'all' ? [] : value.split(','))}>
                                        <SelectTrigger id="filter-vendor-po"><SelectValue placeholder="All Vendors" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Vendors</SelectItem>
                                            {uniqueVendors.map(vendor => <SelectItem key={vendor} value={vendor!}>{vendor!}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={handleExport}> {/* UPDATED onClick */}
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    {user.role === 'admin' && (
                        <Button className="bg-primary hover:bg-primary/90" onClick={openAddDialog}>
                            <Plus className="w-4 h-4 mr-2" /> New Purchase Order
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                 <Card><CardContent className="p-4"><div><div className="text-sm text-muted-foreground">Total Orders</div><div className="text-2xl font-bold">{stats.totalPOs}</div></div></CardContent></Card>
                 <Card><CardContent className="p-4"><div><div className="text-sm text-muted-foreground">Total Value</div><div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div></div></CardContent></Card>
                 <Card><CardContent className="p-4"><div><div className="text-sm text-muted-foreground">Pending</div><div className="text-2xl font-bold text-status-pending">{stats.pending}</div></div></CardContent></Card>
                 <Card><CardContent className="p-4"><div><div className="text-sm text-muted-foreground">Received</div><div className="text-2xl font-bold text-erp-success">{stats.received}</div></div></CardContent></Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Purchase Orders Overview</CardTitle>
                    <p className="text-sm text-muted-foreground">Track and manage all procurement activities</p>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input placeholder="Search PO, Vendor, Material, Item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
                        </div>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>PO ID</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Item Code</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Total Amount</TableHead>
                                    <TableHead>Delivery Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    {user.role === 'admin' && <TableHead>Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center">Loading...</TableCell></TableRow> )}
                                {error && !isLoading && procurementData.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center text-red-600">{error}</TableCell></TableRow> )}
                                {!isLoading && !error && paginatedOrders.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center">No purchase orders found.</TableCell></TableRow> )}

                                {paginatedOrders.map((order) => (
                                    <TableRow key={order.po_number}>
                                        <TableCell className="font-medium">{order.po_number}</TableCell>
                                        <TableCell>{order.supplier ?? 'N/A'}</TableCell>
                                        <TableCell>{order.material_name}</TableCell>
                                        <TableCell className="font-mono text-xs">{order.item_code || 'N/A'}</TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>{order.unit_price || 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{order.total_amount || 'N/A'}</TableCell>
                                        <TableCell>{order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</TableCell>
                                        <TableCell><Badge className={`${getStatusColor(order.status)} text-white`}>{order.status}</Badge></TableCell>
                                        {user.role === 'admin' && (
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleEdit(order)}> <Edit className="h-4 w-4" /> </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleDelete(order.po_number)}> <Trash2 className="h-4 w-4" /> </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-center mt-6">
                        <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                </CardContent>
            </Card>

            <NewPurchaseOrderDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onOrderAdded={handleOrderAdded}
                initialPoNumber={nextPoNumber}
            />
            {selectedOrder && (
                <EditPurchaseOrderDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    order={selectedOrder}
                    onOrderUpdated={handleOrderUpdated}
                />
            )}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete PO {orderToDelete}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Procurement;
