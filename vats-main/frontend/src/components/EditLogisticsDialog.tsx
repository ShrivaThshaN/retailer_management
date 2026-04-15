import { useState, useEffect } from "react"; // Added useEffect
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Interface matching DB structure
interface LogisticsShipment {
    shipment_id: string;
    order_number: string;
    carrier: string;
    tracking_number: string;
    origin: string;
    destination: string;
    departure_date: string;
    estimated_arrival: string;
    status: string;
    priority: string;
}

interface EditLogisticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: LogisticsShipment | null; // Use specific type
  onSave: (shipment: LogisticsShipment) => void; // Use specific type
}

export function EditLogisticsDialog({ open, onOpenChange, shipment, onSave }: EditLogisticsDialogProps) {
  // State for editable fields, matching DB structure (snake_case)
  const [formData, setFormData] = useState({
    carrier: "",
    tracking_number: "",
    departure_date: "",
    estimated_arrival: "",
    status: "",
    priority: "",
  });

   // Update form state when shipment prop changes
   useEffect(() => {
    if (shipment) {
      setFormData({
        carrier: shipment.carrier || "",
        tracking_number: shipment.tracking_number || "",
        departure_date: shipment.departure_date || "",
        estimated_arrival: shipment.estimated_arrival || "",
        status: shipment.status || "",
        priority: shipment.priority || "",
      });
    } else {
        // Reset if shipment is null
         setFormData({ carrier: "", tracking_number: "", departure_date: "", estimated_arrival: "", status: "", priority: "" });
    }
  }, [shipment, open]); // Depend on shipment and open state

  // Generic handler
   const handleChange = (field: keyof typeof formData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
   };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return; // Should not happen

    // Validation
    if (!formData.tracking_number.trim() || !formData.carrier.trim() || !formData.departure_date || !formData.estimated_arrival) {
      toast({
        title: "Validation Error",
        description: "Please fill in Carrier, Tracking Number, Departure Date, and Estimated Arrival.",
        variant: "destructive",
      });
      return;
    }

     try {
        const departure = new Date(formData.departure_date);
        const arrival = new Date(formData.estimated_arrival);
        if (departure > arrival) {
            toast({
                title: "Validation Error",
                description: "Estimated arrival cannot be before departure date.",
                variant: "destructive",
            });
            return;
        }
    } catch(dateError){
        toast({ title: "Validation Error", description: "Invalid date format.", variant: "destructive"});
        return;
    }

    // Combine original non-editable data with updated form data
    const updatedShipment: LogisticsShipment = {
      ...shipment, // Keep original ID, order number, origin, destination
      carrier: formData.carrier,
      tracking_number: formData.tracking_number,
      departure_date: formData.departure_date,
      estimated_arrival: formData.estimated_arrival,
      status: formData.status,
      priority: formData.priority,
    };

    // Call onSave with the complete updated object
    onSave(updatedShipment);

    // Parent handles closing
    // onOpenChange(false);
  };

   // Render nothing if shipment prop is null
   if (!shipment) {
     return null;
   }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Shipment - {shipment.shipment_id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Disabled Fields */}
          <div className="space-y-2">
            <Label>Shipment ID</Label>
            <Input value={shipment.shipment_id} disabled />
          </div>
          <div className="space-y-2">
            <Label>Order Number</Label>
            <Input value={shipment.order_number} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origin</Label>
              <Input value={shipment.origin} disabled />
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input value={shipment.destination} disabled />
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-2">
            <Label htmlFor="edit_carrier">Carrier *</Label>
            <Input
              id="edit_carrier"
              value={formData.carrier}
              onChange={(e) => handleChange('carrier', e.target.value)}
              placeholder="Enter carrier name"
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_tracking_number">Tracking Number *</Label>
            <Input
              id="edit_tracking_number"
              value={formData.tracking_number}
              onChange={(e) => handleChange('tracking_number', e.target.value)}
              placeholder="Enter tracking number"
              required
              maxLength={50}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_departure_date">Departure Date *</Label>
              <Input
                id="edit_departure_date"
                type="date"
                value={formData.departure_date}
                onChange={(e) => handleChange('departure_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_estimated_arrival">Estimated Arrival *</Label>
              <Input
                id="edit_estimated_arrival"
                type="date"
                value={formData.estimated_arrival}
                onChange={(e) => handleChange('estimated_arrival', e.target.value)}
                min={formData.departure_date} // Min arrival is departure date
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger id="edit_status">
                  <SelectValue placeholder="Select Status"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preparing">Preparing</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                <SelectTrigger id="edit_priority">
                  <SelectValue placeholder="Select Priority"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
