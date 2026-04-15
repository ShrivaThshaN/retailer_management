import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// --- ADDED: Interface for the customer orders we will fetch ---
interface CustomerOrder {
  orderNumber: string;
  productName: string;
}

// Interface for data passed to parent (camelCase)
export interface NewScheduleData {
  productName: string,
  orderNumber: string,
  plannedStartDate: string, // YYYY-MM-DD
  plannedEndDate: string, // YYYY-MM-DD
  priority: string,
  workstation: string,
  supervisor: string
}

interface NewScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleAdded: (scheduleData: NewScheduleData) => void;
}

export const NewScheduleDialog = ({ open, onOpenChange, onScheduleAdded }: NewScheduleDialogProps) => {

  // --- UPDATED: Form state ---
  const [productName, setProductName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState<Date>();
  const [plannedEndDate, setPlannedEndDate] = useState<Date>();
  const [priority, setPriority] = useState("");
  const [workstation, setWorkstation] = useState("");
  const [supervisor, setSupervisor] = useState("");

  // --- ADDED: State for auto-fill logic ---
  const [allCustomerOrders, setAllCustomerOrders] = useState<CustomerOrder[]>([]);
  const [isProductNameDisabled, setIsProductNameDisabled] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // --- UPDATED: Reset form AND fetch orders when dialog opens ---
  useEffect(() => {
    if (open) {
      // 1. Reset all form fields
      setProductName("");
      setOrderNumber("");
      setPlannedStartDate(undefined);
      setPlannedEndDate(undefined);
      setPriority("");
      setWorkstation("");
      setSupervisor("");
      setOrderError(null);
      setIsProductNameDisabled(false);

      // 2. Fetch all customer orders
      const fetchCustomerOrders = async () => {
        try {
          const response = await fetch("http://localhost:5001/api/customer-orders");
          if (!response.ok) throw new Error("Failed to fetch orders");
          const data = await response.json();
          setAllCustomerOrders(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error("Error fetching customer orders:", e);
          setAllCustomerOrders([]); // Set to empty on error
        }
      };
      fetchCustomerOrders();

    }
  }, [open]);

  // --- ADDED: Watcher for Order Number input ---
  // This runs every time the user types in the Order Number box
  useEffect(() => {
    if (orderNumber) {
      const foundOrder = allCustomerOrders.find(
        (order) => order.orderNumber === orderNumber
      );
      
      if (foundOrder) {
        setProductName(foundOrder.productName); // Auto-fill product name
        setIsProductNameDisabled(true); // Disable the input
        setOrderError(null); // Clear any error
      } else {
        setProductName(""); // Clear product name if no match
        setIsProductNameDisabled(false); // Enable input
        setOrderError("Order number not found."); // Set an error
      }
    } else {
      // Clear fields if orderNumber is empty
      setProductName("");
      setIsProductNameDisabled(false);
      setOrderError(null);
    }
  }, [orderNumber, allCustomerOrders]); // Re-run when orderNumber or the fetched list changes


  // --- UPDATED: Handle form submission ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Updated Validation
    if (orderError) {
      toast({ title: "Error", description: "Order number not found. Please enter a valid order.", variant: "destructive" });
      return;
    }

    if (!productName || !orderNumber || !plannedStartDate || !plannedEndDate || !priority || !workstation || !supervisor) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    
    if (plannedEndDate < plannedStartDate) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }

    const newScheduleBase: NewScheduleData = {
      productName,
      orderNumber,
      plannedStartDate: format(plannedStartDate, 'yyyy-MM-dd'),
      plannedEndDate: format(plannedEndDate, 'yyyy-MM-dd'),
      priority,
      workstation,
      supervisor,
    };
    
    onScheduleAdded(newScheduleBase);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Production Schedule</DialogTitle>
            <DialogDescription>
              Add a new item to the production schedule. Order Number must exist.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            
            {/* --- UPDATED: Order Number Field --- */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order" className="text-right">Order Number *</Label>
              <div className="col-span-3">
                <Input 
                  id="order" 
                  value={orderNumber} 
                  onChange={(e) => setOrderNumber(e.target.value)} 
                  placeholder="e.g., CO-2025-001" 
                  required 
                />
                {/* Show error message if order not found */}
                {orderError && <p className="text-xs text-red-600 mt-1">{orderError}</p>}
                {!orderError && !isProductNameDisabled && <p className="text-xs text-muted-foreground mt-1">Must match an existing order.</p>}
              </div>
            </div>

            {/* --- UPDATED: Product Field --- */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product" className="text-right">Product *</Label>
              <Input 
                id="product" 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)} 
                placeholder="Auto-fills from order" 
                className="col-span-3" 
                disabled={isProductNameDisabled} // Now disables when order is found
                required 
              />
            </div>
            
            {/* --- (Rest of the form is unchanged) --- */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">Planned Start *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="startDate" variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !plannedStartDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {plannedStartDate ? format(plannedStartDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={plannedStartDate} onSelect={setPlannedStartDate} disabled={(date) => date < today} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">Planned End *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="endDate" variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !plannedEndDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {plannedEndDate ? format(plannedEndDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={plannedEndDate} onSelect={setPlannedEndDate} disabled={(date) => (plannedStartDate && date < plannedStartDate) || date < today} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority" className="col-span-3"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workstation" className="text-right">Workstation *</Label>
              <Select value={workstation} onValueChange={setWorkstation}>
                <SelectTrigger id="workstation" className="col-span-3"><SelectValue placeholder="Select workstation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assembly Line A">Assembly Line A</SelectItem>
                  <SelectItem value="Assembly Line B">Assembly Line B</SelectItem>
                  <SelectItem value="Fabrication Bay B">Fabrication Bay B</SelectItem>
                  <SelectItem value="Extrusion Line C">Extrusion Line C</SelectItem>
                  <SelectItem value="Motor Assembly D">Motor Assembly D</SelectItem>
                  <SelectItem value="Electronics Lab E">Electronics Lab E</SelectItem>
                  <SelectItem value="Hydraulics Bay F">Hydraulics Bay F</SelectItem>
                  <SelectItem value="Frame Assembly G">Frame Assembly G</SelectItem>
                  <SelectItem value="Welding Station 1">Welding Station 1</SelectItem>
                  <SelectItem value="Painting Booth">Painting Booth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supervisor" className="text-right">Supervisor *</Label>
              <Input id="supervisor" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Enter supervisor name" className="col-span-3" required/>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
