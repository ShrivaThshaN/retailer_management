import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Interface for data passed back to parent (matches DB structure, minus ID)
interface NewShipmentData {
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


interface NewLogisticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (shipmentData: NewShipmentData) => void; // Use specific type
}

export function NewLogisticsDialog({ open, onOpenChange, onAdd }: NewLogisticsDialogProps) {
  // Initial state uses snake_case matching the interface/DB
  const [formData, setFormData] = useState<NewShipmentData>({
    order_number: "",
    carrier: "",
    tracking_number: "",
    origin: "",
    destination: "",
    departure_date: new Date().toISOString().split('T')[0], // Default departure to today
    estimated_arrival: "",
    status: "Preparing", // Default status
    priority: "Medium", // Default priority
  });

   // Generic handler
   const handleChange = (field: keyof NewShipmentData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
   };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation (using snake_case keys)
    if (!formData.order_number.trim() || !formData.carrier.trim() || !formData.tracking_number.trim() ||
        !formData.origin.trim() || !formData.destination.trim() || !formData.departure_date || !formData.estimated_arrival) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required (*) fields.",
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


    // Call onAdd with the snake_case data
    onAdd(formData);

    // Resetting form data is optional, parent handles closing
    // setFormData({ ...initial state... });
    // onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_order_number">Order Number *</Label>
            <Input
              id="new_order_number"
              value={formData.order_number}
              onChange={(e) => handleChange('order_number', e.target.value)}
              placeholder="e.g., CO-2025-001"
              required
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_origin">Origin *</Label>
              <Input
                id="new_origin"
                value={formData.origin}
                onChange={(e) => handleChange('origin', e.target.value)}
                placeholder="Warehouse A"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_destination">Destination *</Label>
              <Input
                id="new_destination"
                value={formData.destination}
                onChange={(e) => handleChange('destination', e.target.value)}
                placeholder="New York, NY"
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_carrier">Carrier *</Label>
            <Input
              id="new_carrier"
              value={formData.carrier}
              onChange={(e) => handleChange('carrier', e.target.value)}
              placeholder="FedEx Express"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_tracking_number">Tracking Number *</Label>
            <Input
              id="new_tracking_number"
              value={formData.tracking_number}
              onChange={(e) => handleChange('tracking_number', e.target.value)}
              placeholder="1234567890"
              required
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_departure_date">Departure Date *</Label>
              <Input
                id="new_departure_date"
                type="date"
                value={formData.departure_date}
                onChange={(e) => handleChange('departure_date', e.target.value)}
                // min={new Date().toISOString().split('T')[0]} // Allow past dates if needed
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_estimated_arrival">Estimated Arrival *</Label>
              <Input
                id="new_estimated_arrival"
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
              <Label htmlFor="new_status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger id="new_status">
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
              <Label htmlFor="new_priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                <SelectTrigger id="new_priority">
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
            <Button type="submit">Create Shipment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
