import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Filter, Download, Search, Edit, Trash2, Plus } from "lucide-react";
import { PaginationComponent } from "@/components/Pagination";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/hooks/use-toast";
import { EditMaterialDialog, MaterialRequirement } from "@/components/EditMaterialDialog";
import { NewMaterialDialog, NewMaterialData } from "@/components/NewMaterialDialog";
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

interface MaterialRequirementFromAPI extends MaterialRequirement {
  available_qty: number;
  shortfall: number;
}

const API_MRP_URL = "http://localhost:5001/api/mrp";

const MaterialRequirementPlanning = () => {
  const { user } = useUser();
  const [materialData, setMaterialData] = useState<MaterialRequirementFromAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingMaterial, setEditingMaterial] = useState<MaterialRequirement | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialRequirementFromAPI | null>(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cacheBuster = `?t=${new Date().getTime()}`;
      const mrpResponse = await fetch(API_MRP_URL + cacheBuster);
      if (!mrpResponse.ok) {
        throw new Error(`MRP fetch failed: ${mrpResponse.statusText}`);
      }
      const mrpData = await mrpResponse.json();
      setMaterialData(Array.isArray(mrpData) ? (mrpData as MaterialRequirementFromAPI[]) : []);
    } catch (e: any) {
      console.error("Failed to fetch data:", e);
      setError(`Failed to load data: ${e.message}`);
      toast({ title: "Error Loading Data", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const stats = {
        totalItems: materialData.length,
        available: materialData.filter(item => item.shortfall <= 0).length,
        shortage: materialData.filter(item => item.shortfall > 0).length,
        required: materialData.filter(item => item.status === "Required").length,
        ordered: materialData.filter(item => item.status === "Ordered").length,
  };

  const handleEditMaterial = (material: MaterialRequirementFromAPI) => {
    setEditingMaterial(material);
    setIsEditDialogOpen(true);
  };

  const handleSaveMaterial = async (updatedMaterial: MaterialRequirement) => {
    try {
      if (!updatedMaterial?.material_code) throw new Error("Material code is missing.");
      const response = await fetch(`${API_MRP_URL}/${updatedMaterial.material_code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedMaterial),
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }
      await fetchAllData();
      toast({ title: "Material Updated", description: `${updatedMaterial.material_name} updated.` });
      setIsEditDialogOpen(false);
      setEditingMaterial(null);
    } catch (e: any) {
      console.error("Failed to save material:", e);
      toast({ title: "Error Saving", description: e.message, variant: "destructive" });
    }
  };

  const handleAddMaterial = async (newMaterialData: NewMaterialData) => {
    let material_code = '';
    const relatedOrder = newMaterialData.related_order;

    if (relatedOrder && relatedOrder.startsWith('CO-')) {
        const orderNumPart = relatedOrder.split('-').pop()?.padStart(3, '0') || 'XXX';
        const allExistingForOrder = materialData.filter(m => m.related_order === relatedOrder);
        const lastMaterial = allExistingForOrder.sort((a,b) => a.material_code.localeCompare(b.material_code)).pop();
        let newLetter = 'A';
        if (lastMaterial) {
            const lastCodeParts = lastMaterial.material_code.split('-');
            const lastLetter = lastCodeParts.pop();
            if (lastLetter && /^[A-Z]$/.test(lastLetter)) {
                newLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
            }
        }
        material_code = `MAT-${orderNumPart}-${newLetter}`;
    } else {
        const timestampPart = Date.now().toString().slice(-5);
        material_code = `MAT-M${timestampPart}`;
    }

    const materialToSend = {
      ...newMaterialData,
      material_code,
    };

    try {
        const response = await fetch(API_MRP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(materialToSend),
        });
        if (!response.ok) {
            const errorData = await response.json();
             if (response.status === 409) {
                 throw new Error(errorData.error || `Material code '${material_code}' might already exist due to concurrent additions.`);
             }
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        await fetchAllData();
        toast({ title: "Material Requirement Added", description: `${newMaterialData.material_name} added with code ${material_code}.` });
        setIsNewDialogOpen(false);
    } catch (e: any) {
        console.error("Failed to add material requirement:", e);
        toast({ title: "Error Adding", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteClick = (material: MaterialRequirementFromAPI) => {
    setMaterialToDelete(material);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    try {
        const response = await fetch(`${API_MRP_URL}/${materialToDelete.material_code}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        await fetchAllData();
        toast({ title: "Material Deleted", description: `${materialToDelete.material_name} removed.`, variant: "destructive" });
    } catch (e: any) {
        console.error("Failed to delete material:", e);
        toast({ title: "Error Deleting", description: e.message, variant: "destructive" });
    } finally {
        setMaterialToDelete(null);
        setDeleteConfirmOpen(false);
    }
  };

  const filteredData = materialData.filter(item => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = (item.material_name?.toLowerCase() || '').includes(searchTermLower) ||
                         (item.material_code?.toLowerCase() || '').includes(searchTermLower) ||
                         (item.supplier?.toLowerCase() || '').includes(searchTermLower) ||
                         (item.item_code?.toLowerCase() || '').includes(searchTermLower) ||
                         (item.related_order?.toLowerCase() || '').includes(searchTermLower);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSupplier = supplierFilter === "all" || item.supplier === supplierFilter;
    const matchesMaterial = materialFilter === "all" || item.material_name === materialFilter;
    return matchesSearch && matchesStatus && matchesSupplier && matchesMaterial;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Received": return <Badge className="bg-status-completed text-white">Received</Badge>;
      case "Ordered": return <Badge className="bg-status-progress text-white">Ordered</Badge>;
      case "Required": return <Badge className="bg-status-pending text-white">Required</Badge>;
      case "Shortage": return <Badge className="bg-status-delayed text-white">Shortage</Badge>;
      case "Available": return <Badge className="bg-status-completed text-white">Available</Badge>;
      default: return <Badge variant="secondary">{status || 'N/A'}</Badge>;
    }
  };

  const handleExport = () => {
    if (!filteredData || filteredData.length === 0) {
      toast({ title: "Export Failed", description: "No data available to export.", variant: "destructive"});
      return;
    }

    const headers = ["Material Code", "Material Name", "Item Code", "Related Order", "Required", "Available", "Shortfall", "Supplier", "Lead Time", "Status", "Planned Date"];

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
        item.material_code,
        item.material_name,
        item.item_code,
        item.related_order,
        item.required_qty,
        item.available_qty, // Directly from API (live calculated)
        item.shortfall,     // Directly from API (live calculated)
        item.supplier,
        item.lead_time,
        item.status,
        item.planned_date ? new Date(item.planned_date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A' // Format date
      ].map(formatCSVField).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "material_requirements.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };


  if (isLoading) { return <div className="p-6 text-center text-muted-foreground">Loading Material Requirements...</div>; }
  if (error && !isLoading) { return <div className="p-6 text-center text-red-600">Error: {error}</div>; }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
         <div>
            <h1 className="text-3xl font-bold text-foreground">Material Requirement Planning</h1>
            <p className="text-muted-foreground">Monitor material requirements, availability, and procurement status</p>
         </div>
         <div className="flex space-x-2">
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogTrigger asChild><Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button></DialogTrigger>
                <DialogContent className="sm:max-w-md">
                   <DialogHeader>
                       <DialogTitle>Filter Requirements</DialogTitle>
                       <DialogDescription>Filter by status, supplier, or material.</DialogDescription>
                   </DialogHeader>
                    <div className="space-y-4 py-4">
                       <div>
                           <Label htmlFor="filter-status-mrp">Status</Label>
                           <Select value={statusFilter} onValueChange={setStatusFilter}>
                               <SelectTrigger id="filter-status-mrp"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="all">All Statuses</SelectItem>
                                   {Array.from(new Set(materialData.map(i => i.status))).filter(Boolean).sort().map(status => (
                                     <SelectItem key={status} value={status}>{status}</SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                       </div>
                       <div>
                           <Label htmlFor="filter-supplier-mrp">Supplier</Label>
                           <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                               <SelectTrigger id="filter-supplier-mrp"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="all">All Suppliers</SelectItem>
                                   {Array.from(new Set(materialData.map(i => i.supplier))).filter(Boolean).sort().map(supplier => (
                                     <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                       </div>
                        <div>
                           <Label htmlFor="filter-material-mrp">Material</Label>
                           <Select value={materialFilter} onValueChange={setMaterialFilter}>
                               <SelectTrigger id="filter-material-mrp"><SelectValue placeholder="All Materials" /></SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="all">All Materials</SelectItem>
                                   {Array.from(new Set(materialData.map(i => i.material_name))).filter(Boolean).sort().map(name => (
                                     <SelectItem key={name} value={name}>{name}</SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                       </div>
                   </div>
                </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleExport}> {/* UPDATED onClick */}
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            {user.role === 'admin' && (<Button className="bg-primary hover:bg-primary/90" onClick={() => setIsNewDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Manual Req.</Button>)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
          <Card> <CardContent className="p-4 text-center"> <div className="text-2xl font-bold">{stats.totalItems}</div><div className="text-sm text-muted-foreground">Total Items</div> </CardContent> </Card>
          <Card> <CardContent className="p-4 text-center"> <div className="text-2xl font-bold text-erp-success">{stats.available}</div><div className="text-sm text-muted-foreground">Sufficient Stock</div> </CardContent> </Card>
          <Card> <CardContent className="p-4 text-center"> <div className="text-2xl font-bold text-erp-warning">{stats.shortage}</div><div className="text-sm text-muted-foreground">Shortage</div> </CardContent> </Card>
          <Card> <CardContent className="p-4 text-center"> <div className="text-2xl font-bold text-status-pending">{stats.ordered + stats.required}</div><div className="text-sm text-muted-foreground">Ordered/Required</div> </CardContent> </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material Requirements Overview</CardTitle>
           <p className="text-sm text-muted-foreground">Monitor material requirements, availability, and procurement status</p>
        </CardHeader>
        <CardContent>
          <div className="relative flex-1 max-w-sm mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search Code, Name, Item, Order, Supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Material Code</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Related Order</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Shortfall</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Planned Date</TableHead>
                    {user.role === 'admin' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 12 : 11} className="h-24 text-center">Loading...</TableCell></TableRow> )}
                 {error && !isLoading && materialData.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 12 : 11} className="h-24 text-center text-red-600">{error}</TableCell></TableRow> )}
                 {!isLoading && !error && paginatedData.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 12 : 11} className="h-24 text-center">No requirements found.</TableCell></TableRow> )}

                {paginatedData.map((item) => (
                  <TableRow key={item.material_code}>
                    <TableCell className="font-medium">{item.material_code}</TableCell>
                    <TableCell>{item.material_name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.item_code}</TableCell>
                    <TableCell className="font-medium text-status-progress">{item.related_order}</TableCell>
                    <TableCell>{item.required_qty}</TableCell>
                    <TableCell>{item.available_qty}</TableCell>
                    <TableCell className={item.shortfall > 0 ? "text-erp-danger font-medium" : ""}>{item.shortfall}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>{item.lead_time}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{item.planned_date ? new Date(item.planned_date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</TableCell>
                    {user.role === 'admin' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditMaterial(item)}> <Edit className="h-4 w-4" /> </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteClick(item)}> <Trash2 className="h-4 w-4" /> </Button>
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

      {editingMaterial && (
        <EditMaterialDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          material={editingMaterial}
          onSave={handleSaveMaterial}
        />
      )}

      <NewMaterialDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onAdd={handleAddMaterial}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete {materialToDelete?.material_name} ({materialToDelete?.material_code}). This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setMaterialToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaterialRequirementPlanning;
