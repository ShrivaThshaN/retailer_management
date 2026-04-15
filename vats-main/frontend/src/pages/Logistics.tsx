import { useState, useEffect, useCallback } from "react"; // Added useEffect, useCallback
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Download, Truck, MapPin, Clock, Package, Edit, Trash2 } from "lucide-react";
import { PaginationComponent } from "@/components/Pagination";

import { useUser } from "@/contexts/UserContext";
import { toast } from "@/hooks/use-toast";
import { EditLogisticsDialog } from "@/components/EditLogisticsDialog";
import { NewLogisticsDialog } from "@/components/NewLogisticsDialog";
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

// Interface matching the database table structure (snake_case)
interface LogisticsShipment {
    shipment_id: string;
    order_number: string;
    carrier: string;
    tracking_number: string;
    origin: string;
    destination: string;
    departure_date: string; // Keep as string (YYYY-MM-DD)
    estimated_arrival: string; // Keep as string (YYYY-MM-DD)
    status: string;
    priority: string;
}

// Backend API endpoint
const API_URL = "http://localhost:5001/api/logistics";

const Logistics = () => {
    const { user } = useUser();
    const [logisticsData, setLogisticsData] = useState<LogisticsShipment[]>([]); // Initialize empty
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [carrierFilter, setCarrierFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [editingShipment, setEditingShipment] = useState<LogisticsShipment | null>(null); // Use interface
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [shipmentToDelete, setShipmentToDelete] = useState<LogisticsShipment | null>(null); // Use interface

    // --- Fetch Data ---
    const fetchLogisticsData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try { const errData = await response.json(); errorMsg = errData.message || errData.error || errorMsg; } catch (e) {}
                throw new Error(errorMsg);
            }
            const data = await response.json();
            setLogisticsData(Array.isArray(data) ? data as LogisticsShipment[] : []);
        } catch (e: any) {
            console.error("Failed to fetch logistics data:", e);
            setError(`Failed to load shipments: ${e.message}`);
            toast({
                title: "Error Loading Data",
                description: "Could not fetch shipments from the server.",
                variant: "destructive",
            });
            setLogisticsData([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogisticsData();
    }, [fetchLogisticsData]);

    // --- Calculate Stats (Client-Side) ---
    const stats = {
        totalShipments: logisticsData.length,
        delivered: logisticsData.filter(item => item.status === "Delivered").length,
        inTransit: logisticsData.filter(item => item.status === "In Transit").length,
        preparing: logisticsData.filter(item => item.status === "Preparing").length,
        delayed: logisticsData.filter(item => item.status === "Delayed").length,
    };

    // --- CRUD Handlers ---

    const handleEditShipment = (shipment: LogisticsShipment) => { // Use interface
        setEditingShipment(shipment);
        setIsEditDialogOpen(true);
    };

    const handleSaveShipment = async (updatedShipmentData: LogisticsShipment) => { // Use interface
        try {
            // Ensure shipment_id is present
            if (!updatedShipmentData?.shipment_id) {
                throw new Error("Cannot update shipment without an ID.");
            }

            const response = await fetch(`${API_URL}/${updatedShipmentData.shipment_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // Send snake_case keys expected by backend
                body: JSON.stringify({
                    order_number: updatedShipmentData.order_number,
                    carrier: updatedShipmentData.carrier,
                    tracking_number: updatedShipmentData.tracking_number,
                    origin: updatedShipmentData.origin,
                    destination: updatedShipmentData.destination,
                    departure_date: updatedShipmentData.departure_date,
                    estimated_arrival: updatedShipmentData.estimated_arrival,
                    status: updatedShipmentData.status,
                    priority: updatedShipmentData.priority,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }
            const savedShipment = await response.json();

            // Update local state
            setLogisticsData(prevData =>
                prevData.map(item => (item.shipment_id === savedShipment.shipment_id ? savedShipment : item))
            );
            toast({
                title: "Shipment Updated",
                description: `Shipment ${savedShipment.shipment_id} updated successfully.`,
            });
            setIsEditDialogOpen(false);
            setEditingShipment(null);

        } catch (e: any) {
            console.error("Failed to save shipment:", e);
            toast({
                title: "Error Saving Shipment",
                description: e.message || "Could not update shipment on the server.",
                variant: "destructive",
            });
        }
    };

    // Type for data from NewLogisticsDialog (before adding ID)
    type NewShipmentData = Omit<LogisticsShipment, 'shipment_id'>;

    const handleAddShipment = async (newShipmentData: NewShipmentData) => {
        // Generate ID client-side (backend expects it)
        let shipmentId;
        // Regex to match CO-YYYY-XXX, where YYYY is year and XXX is the trailing part
        const orderNumberPattern = /CO-(\d{4})-(.+)/;
        const match = newShipmentData.order_number.match(orderNumberPattern);

        if (match) {
            // If pattern CO-YYYY-XXX matches, use SH-YYYY-XXX
            const year = match[1];
            const suffix = match[2];
            shipmentId = `SH-${year}-${suffix}`;
        } else {
            // Fallback if the pattern doesn't match: generic ID
            // Using current year and last 4 digits of timestamp for a generic ID
            shipmentId = `SH-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        }
        
        const newShipment = {
            ...newShipmentData,
            shipment_id: shipmentId,
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send snake_case keys
                body: JSON.stringify(newShipment),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }
            const addedShipment = await response.json();
            setLogisticsData(prevData => [...prevData, addedShipment]); // Add to end
            toast({
                title: "Shipment Added",
                description: `Shipment ${addedShipment.shipment_id} added successfully.`,
            });
            setIsNewDialogOpen(false);
        } catch (e: any) {
            console.error("Failed to add shipment:", e);
            toast({
                title: "Error Adding Shipment",
                description: e.message || "Could not add shipment on the server.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteClick = (shipment: LogisticsShipment) => { // Use interface
        setShipmentToDelete(shipment);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!shipmentToDelete) return;
        try {
            const response = await fetch(`${API_URL}/${shipmentToDelete.shipment_id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }
            setLogisticsData(prevData => prevData.filter(item => item.shipment_id !== shipmentToDelete.shipment_id));
            toast({
                title: "Shipment Deleted",
                description: `Shipment ${shipmentToDelete.shipment_id} has been removed.`,
                variant: "destructive",
            });
        } catch (e: any) {
            console.error("Failed to delete shipment:", e);
            toast({
                title: "Error Deleting Shipment",
                description: e.message || "Could not delete shipment on the server.",
                variant: "destructive",
            });
        } finally {
            setShipmentToDelete(null);
            setDeleteConfirmOpen(false);
        }
    };

    // --- Filtering & Pagination --- (Client-side)
    const filteredData = logisticsData.filter(shipment => {
        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch = (shipment.shipment_id?.toLowerCase() || '').includes(searchTermLower) ||
                                (shipment.order_number?.toLowerCase() || '').includes(searchTermLower) ||
                                (shipment.carrier?.toLowerCase() || '').includes(searchTermLower) ||
                                (shipment.destination?.toLowerCase() || '').includes(searchTermLower) ||
                                (shipment.tracking_number?.toLowerCase() || '').includes(searchTermLower); // Added tracking number

        const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
        const matchesCarrier = carrierFilter === "all" || shipment.carrier === carrierFilter;
        const matchesPriority = priorityFilter === "all" || shipment.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesCarrier && matchesPriority;
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    // --- Export Functionality (NEW) ---
    const handleExportToCSV = () => {
        if (filteredData.length === 0) {
            toast({ title: "Export Failed", description: "No data to export.", variant: "destructive" });
            return;
        }

        // Define the columns for the CSV
        const headers = [
            "Shipment ID", "Order No.", "Carrier", "Tracking No.", "Origin", 
            "Destination", "Departure Date", "Estimated Arrival", "Status", "Priority"
        ];

        // Format data rows
        const csvRows = filteredData.map(shipment => [
            // Ensure fields that might contain commas or newlines are quoted
            `"${shipment.shipment_id}"`,
            `"${shipment.order_number}"`,
            `"${shipment.carrier}"`,
            `"${shipment.tracking_number}"`,
            `"${shipment.origin}"`,
            `"${shipment.destination}"`,
            shipment.departure_date,
            shipment.estimated_arrival,
            shipment.status,
            shipment.priority
        ].join(','));

        // Combine header and rows
        const csvContent = [
            headers.join(','),
            ...csvRows
        ].join('\n');

        // Create a Blob from the CSV content
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `logistics_shipments_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Export Successful", description: "Shipment data downloaded as CSV." });
    };

    // --- Badge Functions --- (Moved inside)
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Delivered": return <Badge className="bg-status-completed text-white">Delivered</Badge>;
            case "In Transit": return <Badge className="bg-primary text-white">In Transit</Badge>;
            case "Preparing": return <Badge className="bg-status-progress text-white">Preparing</Badge>;
            case "Delayed": return <Badge className="bg-status-delayed text-white">Delayed</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "High": return <Badge variant="destructive">High</Badge>;
            case "Medium": return <Badge className="bg-status-progress text-white">Medium</Badge>;
            case "Low": return <Badge variant="secondary">Low</Badge>;
            default: return <Badge variant="secondary">{priority}</Badge>;
        }
    };

    // --- Render Logic ---
    if (isLoading) {
        return <div className="p-6 text-center text-muted-foreground">Loading shipments...</div>;
    }
    if (error && logisticsData.length === 0) {
        return <div className="p-6 text-center text-red-600">Error: {error}</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Logistics & Shipping</h1>
                    <p className="text-muted-foreground">Track shipments, manage deliveries, and coordinate logistics</p>
                </div>
                <div className="flex space-x-2">
                    {/* Filter Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader><DialogTitle>Filter Shipments</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="Delivered">Delivered</SelectItem>
                                            <SelectItem value="In Transit">In Transit</SelectItem>
                                            <SelectItem value="Preparing">Preparing</SelectItem>
                                            <SelectItem value="Delayed">Delayed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Carrier</label>
                                    <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                                        <SelectTrigger><SelectValue placeholder="All Carriers" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Carriers</SelectItem>
                                            {/* Dynamically generate from unique carriers */}
                                            {Array.from(new Set(logisticsData.map(s => s.carrier))).sort().map(carrier => (
                                                <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Priority</label>
                                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                        <SelectTrigger><SelectValue placeholder="All Priorities" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Priorities</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    {/* Export Button - ADDED handleExportToCSV */}
                    <Button variant="outline" onClick={handleExportToCSV}>
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    {/* New Shipment Button */}
                    {user.role === 'admin' && (
                        <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsNewDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> New Shipment
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Shipments</p>
                            <h2 className="text-3xl font-bold mt-1">{stats.totalShipments}</h2>
                        </div>
                        <Package className="w-8 h-8 text-muted-foreground" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Delivered</p>
                            <h2 className="text-3xl font-bold text-green-600 mt-1">{stats.delivered}</h2>
                        </div>
                        <Truck className="w-8 h-8 text-green-600" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">In Transit</p>
                            <h2 className="text-3xl font-bold text-blue-600 mt-1">{stats.inTransit}</h2>
                        </div>
                        <MapPin className="w-8 h-8 text-blue-600" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Delayed</p>
                            <h2 className="text-3xl font-bold text-yellow-500 mt-1">{stats.delayed}</h2>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </CardContent>
                </Card>
            </div>


            <Card>
                <CardHeader>
                    <CardTitle>Active Shipments</CardTitle>
                    <p className="text-sm text-muted-foreground">Monitor all shipments and delivery status</p>
                </CardHeader>
                <CardContent>
                    {/* Search Bar */}
                    <div className="flex items-center space-x-2 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search ID, Order, Carrier, Dest..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Shipment ID</TableHead>
                                    <TableHead>Order No.</TableHead>
                                    <TableHead>Carrier</TableHead>
                                    <TableHead>Tracking No.</TableHead>
                                    <TableHead>Origin</TableHead>
                                    <TableHead>Destination</TableHead>
                                    <TableHead>Departure</TableHead>
                                    <TableHead>ETA</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    {user.role === 'admin' && <TableHead>Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Loading/Error/No Data states */}
                                {isLoading && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 11 : 10} className="h-24 text-center">Loading shipments...</TableCell></TableRow> )}
                                {error && !isLoading && logisticsData.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 11 : 10} className="h-24 text-center text-red-600">{error}</TableCell></TableRow> )}
                                {!isLoading && !error && paginatedData.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 11 : 10} className="h-24 text-center">No shipments found.</TableCell></TableRow> )}
                                {/* Data Rows */}
                                {paginatedData.map((shipment) => (
                                    <TableRow key={shipment.shipment_id}>
                                        <TableCell className="font-medium">{shipment.shipment_id}</TableCell>
                                        <TableCell>{shipment.order_number}</TableCell>
                                        <TableCell>{shipment.carrier}</TableCell>
                                        <TableCell className="font-mono text-sm">{shipment.tracking_number}</TableCell>
                                        <TableCell>{shipment.origin}</TableCell>
                                        <TableCell>{shipment.destination}</TableCell>
                                        <TableCell>{new Date(shipment.departure_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(shipment.estimated_arrival).toLocaleDateString()}</TableCell>
                                        <TableCell>{getPriorityBadge(shipment.priority)}</TableCell>
                                        <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                                        {user.role === 'admin' && (
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleEditShipment(shipment)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(shipment)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-center mt-6">
                        <PaginationComponent
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            {editingShipment && (
                <EditLogisticsDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    shipment={editingShipment}
                    onSave={handleSaveShipment} // Pass the updated handler
                />
            )}

            {/* New Dialog */}
            <NewLogisticsDialog
                open={isNewDialogOpen}
                onOpenChange={setIsNewDialogOpen}
                onAdd={handleAddShipment} // Pass the updated handler
            />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete shipment {shipmentToDelete?.shipment_id}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShipmentToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Logistics;
