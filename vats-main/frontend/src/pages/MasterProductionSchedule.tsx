import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, Search, Calendar, Clock, CheckCircle, Edit, Trash2, AlertTriangle } from "lucide-react";
import { PaginationComponent } from "@/components/Pagination";
import { useUser } from "@/contexts/UserContext";
import { NewScheduleDialog, NewScheduleData } from "@/components/NewScheduleDialog";
import { EditScheduleDialog, Schedule } from "@/components/EditScheduleDialog";
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

const API_URL = "http://localhost:5001/api/mps";
const CUSTOMER_ORDER_STORAGE_KEY = "orderManagementOrders"; // Kept for simplified validation

const getStoredData = (key: string, fallback: any[]): any[] => {
  try {
    const storedData = localStorage.getItem(key);
    return storedData ? JSON.parse(storedData) : fallback;
  } catch (e) {
    console.error(`Failed to load ${key}, using initial data.`, e);
    return fallback; // Return fallback on error
  }
};

const MasterProductionSchedule = () => {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const cacheBuster = `?t=${new Date().getTime()}`;
        const response = await fetch(API_URL + cacheBuster);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || errData.error || "Failed to fetch schedules");
        }
        const data = await response.json();
        setSchedules(Array.isArray(data) ? data as Schedule[] : []);
    } catch (e: any) {
        console.error("Failed to fetch schedules:", e);
        setError(`Failed to load schedules: ${e.message}`);
        toast({ title: "Error Loading Data", description: e.message, variant: "destructive" });
        setSchedules([]);
    } finally {
        setIsLoading(false);
    }
  }, [toast]); // Added toast dependency

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const totalSchedules = schedules.length;
  const completed = schedules.filter(item => item.status === "Completed").length;
  const inProgress = schedules.filter(item => item.status === "In Progress").length;
  const delayed = schedules.filter(item => item.status === "Delayed").length;
  const onHoldCount = schedules.filter(item => item.status === "On Hold").length;

  const filteredData = schedules.filter(item => {
    const term = searchTerm.toLowerCase();
    return (item.product_name?.toLowerCase() || '').includes(term) ||
           (item.schedule_id?.toLowerCase() || '').includes(term) ||
           (item.order_number?.toLowerCase() || '').includes(term);
  });
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Completed": return <Badge className="bg-status-completed text-white">Completed</Badge>;
      case "In Progress": return <Badge className="bg-status-progress text-white">In Progress</Badge>;
      case "Scheduled": return <Badge className="bg-status-pending text-white">Scheduled</Badge>;
      case "Delayed": return <Badge className="bg-status-delayed text-white">Delayed</Badge>;
      case "On Hold": return <Badge variant="secondary">On Hold</Badge>;
      default: return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString('en-US', { timeZone: 'UTC' });
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (scheduleId: string | null | undefined) => {
    if (!scheduleId) return;
    setScheduleToDelete(scheduleId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    try {
        const response = await fetch(`${API_URL}/${scheduleToDelete}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        setSchedules(prevData => prevData.filter(item => item.schedule_id !== scheduleToDelete));
        toast({ title: "Success", description: `Schedule ${scheduleToDelete} deleted.` });
    } catch (e: any) {
        console.error("Failed to delete schedule:", e);
        toast({ title: "Error Deleting", description: e.message, variant: "destructive" });
    } finally {
        setIsDeleteDialogOpen(false);
        setScheduleToDelete(null);
    }
  };

  const handleScheduleAdded = async (scheduleDataFromDialog: NewScheduleData) => {
    const payload = {
        product_name: scheduleDataFromDialog.productName,
        order_number: scheduleDataFromDialog.orderNumber,
        planned_start_date: scheduleDataFromDialog.plannedStartDate,
        planned_end_date: scheduleDataFromDialog.plannedEndDate,
        priority: scheduleDataFromDialog.priority,
        workstation: scheduleDataFromDialog.workstation,
        supervisor: scheduleDataFromDialog.supervisor,
        status: "Scheduled",
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }
        const addedSchedule = await response.json();
        setSchedules(prevData => [addedSchedule, ...prevData]); // Add to top
        toast({ title: "Schedule Added", description: `Schedule ${addedSchedule.schedule_id} created.` });
        setIsAddDialogOpen(false);
    } catch (e: any) {
         console.error("Failed to add schedule:", e);
         toast({ title: "Error Adding Schedule", description: e.message, variant: "destructive" });
    }
  };

  const handleScheduleUpdated = async (updatedSchedule: Schedule) => {
    try {
        if (!updatedSchedule?.schedule_id) throw new Error("Schedule ID missing.");

        const response = await fetch(`${API_URL}/${updatedSchedule.schedule_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSchedule)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
        }

        const savedResponse = await response.json();
        setSchedules(prevData =>
            prevData.map(s => (s.schedule_id === savedResponse.schedule.schedule_id ? savedResponse.schedule : s))
        );

        toast({ title: "Update Successful", description: savedResponse.message || `Schedule ${savedResponse.schedule.schedule_id} updated.` });

        setIsEditDialogOpen(false);
        setSelectedSchedule(null);
    } catch (e: any) {
        console.error("Failed to update schedule:", e);
        toast({ title: "Error Updating", description: e.message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (!filteredData || filteredData.length === 0) {
      toast({ title: "Export Failed", description: "No data available to export.", variant: "destructive"});
      return;
    }

    const headers = ["Schedule ID", "Product Name", "Order Number", "Planned Start", "Planned End", "Priority", "Workstation", "Supervisor", "Status"];

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
        item.schedule_id,
        item.product_name,
        item.order_number,
        formatDate(item.planned_start_date),
        formatDate(item.planned_end_date),
        item.priority,
        item.workstation,
        item.supervisor,
        item.status
      ].map(formatCSVField).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "production_schedule.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) { return <div className="p-6 text-center text-muted-foreground">Loading Schedules...</div>; }
  if (error && schedules.length === 0) { return <div className="p-6 text-center text-red-600">Error: {error}</div>; }


  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Master Production Schedule</h1>
          <p className="text-muted-foreground">Plan and track production schedules for all orders</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}> {/* UPDATED onClick */}
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Schedule
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Schedule Overview</CardTitle>
          <p className="text-sm text-muted-foreground">Monitor and manage production timelines</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 mb-6">
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold">{totalSchedules}</div><div className="text-sm text-muted-foreground">Total</div></div><Calendar className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-erp-success">{completed}</div><div className="text-sm text-muted-foreground">Completed</div></div><CheckCircle className="h-8 w-8 text-erp-success" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-status-progress">{inProgress}</div><div className="text-sm text-muted-foreground">In Progress</div></div><Clock className="h-8 w-8 text-status-progress" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-gray-500">{onHoldCount}</div><div className="text-sm text-muted-foreground">On Hold</div></div><AlertTriangle className="h-8 w-8 text-gray-500" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-erp-danger">{delayed}</div><div className="text-sm text-muted-foreground">Delayed</div></div><AlertTriangle className="h-8 w-8 text-erp-danger" /></div></CardContent></Card>
          </div>

          <h3 className="text-lg font-semibold mb-4">Production Schedule</h3>
          <div className="relative flex-1 max-w-sm mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Search ID, Product, Order..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Schedule ID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Planned Start</TableHead>
                  <TableHead>Planned End</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Workstation</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Status</TableHead>
                  {user.role === 'admin' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center">Loading...</TableCell></TableRow> )}
                {error && !isLoading && schedules.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center text-red-600">{error}</TableCell></TableRow> )}
                {!isLoading && !error && paginatedData.length === 0 && ( <TableRow><TableCell colSpan={user.role === 'admin' ? 10 : 9} className="h-24 text-center">No production schedules found.</TableCell></TableRow> )}

                {paginatedData.map((item) => (
                  <TableRow key={item.schedule_id}>
                    <TableCell className="font-medium">{item.schedule_id || 'N/A'}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell className="font-medium text-status-progress">{item.order_number}</TableCell>
                    <TableCell>{formatDate(item.planned_start_date)}</TableCell>
                    <TableCell>{formatDate(item.planned_end_date)}</TableCell>
                    <TableCell><Badge variant={item.priority === "High" ? "destructive" : item.priority === "Medium" ? "default" : "secondary"}>{item.priority}</Badge></TableCell>
                    <TableCell>{item.workstation}</TableCell>
                    <TableCell>{item.supervisor}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    {user.role === 'admin' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}> <Edit className="h-4 w-4" /> </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(item.schedule_id)}> <Trash2 className="h-4 w-4" /> </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-center mt-6">
            <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}/>
          </div>
        </CardContent>
      </Card>

      <NewScheduleDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onScheduleAdded={handleScheduleAdded}
      />

      {selectedSchedule && (
            <EditScheduleDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                schedule={selectedSchedule}
                onScheduleUpdated={handleScheduleUpdated}
            />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete schedule {scheduleToDelete}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScheduleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MasterProductionSchedule;
