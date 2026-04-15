import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Download, CheckCircle, XCircle, AlertTriangle, Clock, Edit, Trash2, ClipboardCheck } from "lucide-react";
import { PaginationComponent } from "@/components/Pagination";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/hooks/use-toast";
import { EditQualityDialog } from "@/components/EditQualityDialog";
import { NewQualityDialog } from "@/components/NewQualityDialog";
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
import { Label } from "@/components/ui/label"; // Ensure Label is imported

interface QualityInspection {
    inspection_id: string;
    product_name: string;
    batch_number: string;
    inspection_date: string;
    inspector: string;
    test_type: string;
    result: string;
    defect_count: number;
    notes: string;
}

const API_URL = "http://localhost:5001/api/quality-control";

const Quality = () => {
  const { user } = useUser();
  const [qualityData, setQualityData] = useState<QualityInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [testTypeFilter, setTestTypeFilter] = useState("all");
  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingInspection, setEditingInspection] = useState<QualityInspection | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState<QualityInspection | null>(null);

  const fetchQualityData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cacheBuster = `?t=${new Date().getTime()}`;
      const response = await fetch(API_URL + cacheBuster);
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg = errData.message || errData.error || errorMsg;
        } catch (parseError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setQualityData(Array.isArray(data) ? data as QualityInspection[] : []);
    } catch (e: any) {
      console.error("Failed to fetch quality data:", e);
      const errorMsg = `Failed to load inspections: ${e.message}`;
      setError(errorMsg);
      toast({
          title: "Error Loading Data",
          description: "Could not fetch quality inspections from the server.",
          variant: "destructive",
      });
       setQualityData([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Added toast dependency

  useEffect(() => {
    fetchQualityData();
  }, [fetchQualityData]);

   const stats = {
        totalInspections: qualityData.length,
        passed: qualityData.filter(item => item.result === "Pass").length,
        failed: qualityData.filter(item => item.result === "Fail").length,
        pending: qualityData.filter(item => item.result === "Pending").length,
        warning: qualityData.filter(item => item.result === "Warning").length,
   };

  const handleEditInspection = (inspection: QualityInspection) => {
    setEditingInspection(inspection);
    setIsEditDialogOpen(true);
  };

  const handleSaveInspection = async (updatedInspection: QualityInspection) => {
    try {
      const response = await fetch(`${API_URL}/${updatedInspection.inspection_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInspection),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }
      const savedInspection = await response.json();
      setQualityData(prevData =>
          prevData.map(item => (item.inspection_id === savedInspection.inspection_id ? savedInspection : item))
      );
      toast({
        title: "Inspection Updated",
        description: `Inspection ${savedInspection.inspection_id} updated successfully.`,
      });
      setIsEditDialogOpen(false);
      setEditingInspection(null);
    } catch (e: any) {
      console.error("Failed to save inspection:", e);
      toast({
        title: "Error Saving Inspection",
        description: e.message || "Could not update inspection on the server.",
        variant: "destructive",
      });
    }
  };

  type NewInspectionData = Omit<QualityInspection, 'inspection_id'>;

  const handleAddInspection = async (newInspectionData: NewInspectionData) => {
    // Generate ID client-side (consider moving to backend for true uniqueness)
    const inspectionId = `QC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const newInspection = { ...newInspectionData, inspection_id: inspectionId };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newInspection),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        const addedInspection = await response.json();
        setQualityData(prevData => [addedInspection, ...prevData]); // Add to the top
        toast({
            title: "Inspection Added",
            description: `Inspection ${addedInspection.inspection_id} added successfully.`,
        });
        setIsNewDialogOpen(false);
    } catch (e: any) {
        console.error("Failed to add inspection:", e);
        toast({
            title: "Error Adding Inspection",
            description: e.message || "Could not add inspection on the server.",
            variant: "destructive",
        });
    }
  };

  const handleDeleteClick = (inspection: QualityInspection) => {
    setInspectionToDelete(inspection);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!inspectionToDelete) return;
    try {
        const response = await fetch(`${API_URL}/${inspectionToDelete.inspection_id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        setQualityData(prevData => prevData.filter(item => item.inspection_id !== inspectionToDelete.inspection_id));
        toast({
            title: "Inspection Deleted",
            description: `Inspection ${inspectionToDelete.inspection_id} has been removed.`,
            variant: "destructive",
        });
    } catch (e: any) {
        console.error("Failed to delete inspection:", e);
         toast({
            title: "Error Deleting Inspection",
            description: e.message || "Could not delete inspection on the server.",
            variant: "destructive",
        });
    } finally {
        setInspectionToDelete(null);
        setDeleteConfirmOpen(false);
    }
  };

  const filteredData = qualityData.filter(item => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = (item.inspection_id?.toLowerCase() || '').includes(searchTermLower) ||
                          (item.product_name?.toLowerCase() || '').includes(searchTermLower) ||
                          (item.batch_number?.toLowerCase() || '').includes(searchTermLower) ||
                          (item.inspector?.toLowerCase() || '').includes(searchTermLower);
    const matchesResult = resultFilter === "all" || item.result === resultFilter;
    const matchesTestType = testTypeFilter === "all" || item.test_type === testTypeFilter;
    const matchesInspector = inspectorFilter === "all" || item.inspector === inspectorFilter;
    return matchesSearch && matchesResult && matchesTestType && matchesInspector;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getResultBadge = (result: string) => {
    switch (result) {
      case "Pass": return <Badge className="bg-status-completed text-white">Pass</Badge>;
      case "Fail": return <Badge className="bg-status-delayed text-white">Fail</Badge>;
      case "Warning": return <Badge className="bg-status-progress text-white">Warning</Badge>;
      case "Pending": return <Badge className="bg-status-pending text-white">Pending</Badge>;
      default: return <Badge variant="secondary">{result}</Badge>;
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case "Pass": return <CheckCircle className="h-4 w-4 text-erp-success" />;
      case "Fail": return <XCircle className="h-4 w-4 text-erp-danger" />;
      case "Warning": return <AlertTriangle className="h-4 w-4 text-erp-warning" />;
      case "Pending": return <Clock className="h-4 w-4 text-erp-info" />;
      default: return null;
    }
  };

  const handleExport = () => {
    if (!filteredData || filteredData.length === 0) {
      toast({ title: "Export Failed", description: "No data available to export.", variant: "destructive"});
      return;
    }

    const headers = ["Inspection ID", "Product Name", "Batch Number", "Inspection Date", "Inspector", "Test Type", "Defects", "Result", "Notes"];

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
        item.inspection_id,
        item.product_name,
        item.batch_number,
        item.inspection_date ? new Date(item.inspection_date).toLocaleDateString() : 'N/A', // Format date
        item.inspector,
        item.test_type,
        item.defect_count,
        item.result,
        item.notes
      ].map(formatCSVField).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quality_inspections.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };


  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading quality inspections...</div>;
  }

  if (error && qualityData.length === 0) {
     return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quality Control</h1>
          <p className="text-muted-foreground">Manage quality inspections, testing, and compliance</p>
        </div>
        <div className="flex space-x-2">
           <Dialog>
             <DialogTrigger asChild>
               <Button variant="outline">
                 <Filter className="w-4 h-4 mr-2" />
                 Filter
               </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Filter Inspections</DialogTitle>
                    <DialogDescription>Filter inspections by result, test type, or inspector.</DialogDescription> {/* Added Description */}
                </DialogHeader>
                 <div className="space-y-4 py-4">
                     <div>
                         <Label htmlFor="filter-result">Result</Label> {/* Used Label */}
                         <Select value={resultFilter} onValueChange={setResultFilter}>
                             <SelectTrigger id="filter-result"><SelectValue placeholder="All Results" /></SelectTrigger> {/* Added ID */}
                             <SelectContent>
                                 <SelectItem value="all">All Results</SelectItem>
                                 <SelectItem value="Pass">Pass</SelectItem>
                                 <SelectItem value="Fail">Fail</SelectItem>
                                 <SelectItem value="Warning">Warning</SelectItem>
                                 <SelectItem value="Pending">Pending</SelectItem>
                             </SelectContent>
                         </Select>
                     </div>
                     <div>
                         <Label htmlFor="filter-test-type">Test Type</Label> {/* Used Label */}
                         <Select value={testTypeFilter} onValueChange={setTestTypeFilter}>
                             <SelectTrigger id="filter-test-type"><SelectValue placeholder="All Test Types" /></SelectTrigger> {/* Added ID */}
                             <SelectContent>
                                 <SelectItem value="all">All Test Types</SelectItem>
                                 <SelectItem value="Dimensional Check">Dimensional Check</SelectItem>
                                 <SelectItem value="Functional Test">Functional Test</SelectItem>
                                 <SelectItem value="Material Analysis">Material Analysis</SelectItem>
                                 <SelectItem value="Assembly Check">Assembly Check</SelectItem>
                                 <SelectItem value="Stress Test">Stress Test</SelectItem>
                                 <SelectItem value="Electrical Test">Electrical Test</SelectItem>
                                 <SelectItem value="Pressure Test">Pressure Test</SelectItem>
                                 <SelectItem value="Balance Test">Balance Test</SelectItem>
                                 <SelectItem value="Weather Resistance">Weather Resistance</SelectItem>
                                 <SelectItem value="Strength Test">Strength Test</SelectItem>
                             </SelectContent>
                         </Select>
                     </div>
                     <div>
                         <Label htmlFor="filter-inspector">Inspector</Label> {/* Used Label */}
                         <Select value={inspectorFilter} onValueChange={setInspectorFilter}>
                            <SelectTrigger id="filter-inspector"><SelectValue placeholder="All Inspectors" /></SelectTrigger> {/* Added ID */}
                             <SelectContent>
                                 <SelectItem value="all">All Inspectors</SelectItem>
                                  {Array.from(new Set(qualityData.map(i => i.inspector))).sort().map(inspector => (
                                     <SelectItem key={inspector} value={inspector}>{inspector}</SelectItem>
                                  ))}
                             </SelectContent>
                         </Select>
                     </div>
                 </div>
             </DialogContent>
           </Dialog>
          <Button variant="outline" onClick={handleExport}> {/* UPDATED onClick */}
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {user.role === 'admin' && (
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsNewDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Inspection
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold">{stats.totalInspections}</div>
                        <div className="text-sm text-muted-foreground">Total Inspections</div>
                    </div>
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold text-erp-success">{stats.passed}</div>
                        <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-erp-success" />
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4">
                 <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold text-erp-danger">{stats.failed}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <XCircle className="h-8 w-8 text-erp-danger" />
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4">
                 <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold text-erp-warning">{stats.pending + stats.warning}</div>
                        <div className="text-sm text-muted-foreground">Pending/Warning</div>
                    </div>
                    <Clock className="h-8 w-8 text-erp-warning" />
                </div>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quality Inspections</CardTitle>
          <p className="text-sm text-muted-foreground">Track quality control inspections and test results</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                    placeholder="Search ID, Product, Batch, Inspector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Inspection ID</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Insp. Date</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Test Type</TableHead>
                    <TableHead>Defects</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="w-[200px]">Notes</TableHead>
                    {user.role === 'admin' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading && (
                     <TableRow>
                         <TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center">
                             Loading inspections...
                         </TableCell>
                     </TableRow>
                 )}
                  {error && !isLoading && qualityData.length === 0 && (
                     <TableRow>
                         <TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center text-red-600">
                             {error}
                         </TableCell>
                     </TableRow>
                 )}
                 {!isLoading && !error && paginatedData.length === 0 && (
                     <TableRow>
                         <TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center">
                             No inspections found matching your filters.
                         </TableCell>
                     </TableRow>
                 )}
                {paginatedData.map((item) => (
                  <TableRow key={item.inspection_id}>
                    <TableCell className="font-medium">{item.inspection_id}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.batch_number}</TableCell>
                    <TableCell>{item.inspection_date ? new Date(item.inspection_date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</TableCell>
                    <TableCell>{item.inspector}</TableCell>
                    <TableCell>{item.test_type}</TableCell>
                    <TableCell className={`font-medium ${item.defect_count > 0 ? 'text-erp-danger' : 'text-erp-success'}`}>
                      {item.defect_count}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getResultIcon(item.result)}
                        {getResultBadge(item.result)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.notes}>
                      {item.notes}
                    </TableCell>
                    {user.role === 'admin' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditInspection(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(item)}
                          >
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

          <div className="flex justify-center mt-6">
            <PaginationComponent
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </CardContent>
      </Card>

      {editingInspection && (
        <EditQualityDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          inspection={editingInspection}
          onSave={handleSaveInspection}
        />
      )}

      <NewQualityDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onAdd={handleAddInspection}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete inspection {inspectionToDelete?.inspection_id}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInspectionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Quality;
