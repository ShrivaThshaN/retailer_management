import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Download, Package, TrendingDown, AlertTriangle, CheckCircle, Edit, Trash2 } from "lucide-react";
import { PaginationComponent } from "@/components/Pagination";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/hooks/use-toast";
import { EditInventoryDialog } from "@/components/EditInventoryDialog";
import { NewInventoryDialog } from "@/components/NewInventoryDialog";
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
import { Label } from "@/components/ui/label";

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

const API_URL = "http://localhost:5001/api/inventory";

const Inventory = () => {
  const { user } = useUser();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const fetchInventoryData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cacheBuster = `?t=${new Date().getTime()}`;
      const response = await fetch(API_URL + cacheBuster);
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try { const errData = await response.json(); errorMsg = errData.message || errData.error || errorMsg; } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setInventoryData(Array.isArray(data) ? data as InventoryItem[] : []);
    } catch (e: any) {
      console.error("Failed to fetch inventory:", e);
      setError(`Failed to load inventory: ${e.message}`);
      toast({ title: "Error Loading Data", description: e.message, variant: "destructive" });
      setInventoryData([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Added toast dependency

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const stats = isLoading ? { totalItems: 0, inStock: 0, lowStock: 0, outOfStock: 0 } : {
        totalItems: inventoryData.length,
        inStock: inventoryData.filter(item => item.status === "In Stock").length,
        lowStock: inventoryData.filter(item => item.status === "Low Stock").length,
        outOfStock: inventoryData.filter(item => item.status === "Out of Stock").length,
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleSaveItem = async (updatedItemData: InventoryItem) => {
    try {
        if (!updatedItemData?.item_code) throw new Error("Item code missing.");
        const response = await fetch(`${API_URL}/${updatedItemData.item_code}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItemData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        const savedItem = await response.json();
        setInventoryData(prevData =>
            prevData.map(item => (item.item_code === savedItem.item_code ? savedItem : item))
        );
        toast({ title: "Item Updated", description: `${savedItem.item_name} updated successfully.` });
        setIsEditDialogOpen(false);
        setEditingItem(null);
    } catch (e: any) {
        console.error("Failed to save item:", e);
        toast({ title: "Error Saving", description: e.message, variant: "destructive" });
    }
  };

  type NewItemData = Omit<InventoryItem, 'item_code' | 'last_updated'>;

  const handleAddItem = async (newItemData: NewItemData) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItemData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        const addedItem = await response.json();
        setInventoryData(prevData => [...prevData, addedItem]);
        toast({ title: "Item Added", description: `${addedItem.item_name} added successfully.` });
        setIsNewDialogOpen(false);
    } catch (e: any) {
        console.error("Failed to add item:", e);
        toast({ title: "Error Adding", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
        const response = await fetch(`${API_URL}/${itemToDelete.item_code}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        setInventoryData(prevData => prevData.filter(item => item.item_code !== itemToDelete.item_code));
        toast({ title: "Item Deleted", description: `${itemToDelete.item_name} removed.`, variant: "destructive" });
    } catch (e: any) {
        console.error("Failed to delete item:", e);
        toast({ title: "Error Deleting", description: e.message, variant: "destructive" });
    } finally {
        setItemToDelete(null);
        setDeleteConfirmOpen(false);
    }
  };

  const filteredData = inventoryData.filter(item => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = (item.item_name?.toLowerCase() || '').includes(searchTermLower) ||
                           (item.item_code?.toLowerCase() || '').includes(searchTermLower) ||
                           (item.category?.toLowerCase() || '').includes(searchTermLower);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesLocation = locationFilter === "all" || item.location === locationFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
  });
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string | null) => {
        const statusStr = status || 'N/A';
        switch (statusStr) {
            case "In Stock": return <Badge className="bg-status-completed text-white">In Stock</Badge>;
            case "Low Stock": return <Badge className="bg-status-progress text-white">Low Stock</Badge>;
            case "Out of Stock": return <Badge className="bg-status-delayed text-white">Out of Stock</Badge>;
            default: return <Badge variant="secondary">{statusStr}</Badge>;
        }
  };

  const getStockLevel = (current: number, minimum: number | null) => {
      if (current <= 0) return "text-erp-danger";
      if (minimum != null && current <= minimum) return "text-erp-warning";
      return "text-erp-success";
  };

  const handleExport = () => {
    if (!filteredData || filteredData.length === 0) {
      toast({ title: "Export Failed", description: "No data available to export.", variant: "destructive"});
      return;
    }

    const headers = ["Item Code", "Item Name", "Category", "Current Stock", "Min Stock", "Max Stock", "Location", "Unit Price", "Status", "Last Updated"];

    const formatCSVField = (field: any): string => {
      const value = field === null || field === undefined ? '' : String(field);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(formatCSVField).join(","),
      ...filteredData.map(item => [
        item.item_code,
        item.item_name,
        item.category,
        item.current_stock,
        item.minimum_stock,
        item.maximum_stock,
        item.location,
        item.unit_price,
        item.status,
        item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'N/A'
      ].map(formatCSVField).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) { return <div className="p-6 text-center text-muted-foreground">Loading Inventory...</div>; }
  if (error && inventoryData.length === 0) { return <div className="p-6 text-center text-red-600">Error: {error}</div>; }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Track stock levels, locations, and inventory movements</p>
        </div>
        <div className="flex space-x-2">
           <Dialog>
             <DialogTrigger asChild><Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button></DialogTrigger>
             <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Filter Inventory</DialogTitle>
                    <DialogDescription>Filter items by category, status, or location.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="filter-category">Category</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger id="filter-category"><SelectValue placeholder="All Categories" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                                <SelectItem value="Fasteners">Fasteners</SelectItem>
                                <SelectItem value="Sealing">Sealing</SelectItem>
                                <SelectItem value="Components">Components</SelectItem>
                                <SelectItem value="Electronics">Electronics</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="filter-status">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger id="filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="In Stock">In Stock</SelectItem>
                                <SelectItem value="Low Stock">Low Stock</SelectItem>
                                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="filter-location">Location</Label>
                        <Select value={locationFilter} onValueChange={setLocationFilter}>
                            <SelectTrigger id="filter-location"><SelectValue placeholder="All Locations" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Locations</SelectItem>
                                <SelectItem value="Warehouse A-1">Warehouse A-1</SelectItem>
                                <SelectItem value="Warehouse B-2">Warehouse B-2</SelectItem>
                                <SelectItem value="Warehouse C-1">Warehouse C-1</SelectItem>
                                <SelectItem value="Warehouse D-3">Warehouse D-3</SelectItem>
                                <SelectItem value="Warehouse E-1">Warehouse E-1</SelectItem>
                                <SelectItem value="Warehouse F-2">Warehouse F-2</SelectItem>
                                <SelectItem value="Warehouse B-3">Warehouse B-3</SelectItem>
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
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsNewDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold">{stats.totalItems}</div><div className="text-sm text-muted-foreground">Total Items</div></div><Package className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-erp-success">{stats.inStock}</div><div className="text-sm text-muted-foreground">In Stock</div></div><CheckCircle className="h-8 w-8 text-erp-success" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-erp-warning">{stats.lowStock}</div><div className="text-sm text-muted-foreground">Low Stock</div></div><TrendingDown className="h-8 w-8 text-erp-warning" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-erp-danger">{stats.outOfStock}</div><div className="text-sm text-muted-foreground">Out of Stock</div></div><AlertTriangle className="h-8 w-8 text-erp-danger" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <p className="text-sm text-muted-foreground">Monitor stock levels and inventory status</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Search inventory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min/Max</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  {user.role === 'admin' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center">Loading...</TableCell></TableRow> )}
                 {error && !isLoading && inventoryData.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center text-red-600">{error}</TableCell></TableRow> )}
                 {!isLoading && !error && paginatedData.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center">No inventory items found.</TableCell></TableRow> )}
                {paginatedData.map((item) => (
                  <TableRow key={item.item_code}>
                    <TableCell className="font-medium">{item.item_code}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.category || 'N/A'}</TableCell>
                    <TableCell className={`font-medium ${getStockLevel(item.current_stock, item.minimum_stock)}`}>
                      {item.current_stock}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.minimum_stock ?? 'N/A'}/{item.maximum_stock ?? 'N/A'}
                    </TableCell>
                    <TableCell>{item.location || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{item.unit_price || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'N/A'}</TableCell>
                    {user.role === 'admin' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}> <Edit className="h-4 w-4" /> </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteClick(item)}> <Trash2 className="h-4 w-4" /> </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-center">
            <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}/>
          </div>
        </CardContent>
      </Card>

      {editingItem && (
        <EditInventoryDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          item={editingItem}
          onSave={handleSaveItem}
        />
      )}

      <NewInventoryDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onAdd={handleAddItem}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {itemToDelete?.item_name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
