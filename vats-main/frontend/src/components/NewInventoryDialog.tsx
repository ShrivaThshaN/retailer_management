import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Added Desc
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Type for data sent to parent/API (snake_case, no generated fields)
interface NewItemData {
  item_name: string;
  category: string | null;
  current_stock: number;
  minimum_stock: number | null;
  maximum_stock: number | null;
  location: string | null;
  unit_price: string | null;
  status: string | null; // Allow initial status setting if needed by backend
}

interface NewInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (itemData: NewItemData) => void; // Use specific type
}

export function NewInventoryDialog({ open, onOpenChange, onAdd }: NewInventoryDialogProps) {
  // Use snake_case for state keys
  const [formData, setFormData] = useState<NewItemData>({
    item_name: "",
    category: "Raw Materials", // Default category
    current_stock: 0,
    minimum_stock: 0,
    maximum_stock: 0,
    location: "",
    unit_price: "",
    status: "In Stock", // Default status, backend might recalculate
  });

   // Generic handler
   const handleChange = (field: keyof NewItemData, value: string | number | null) => {
      // Ensure numeric fields remain numbers
      if (field === 'current_stock' || field === 'minimum_stock' || field === 'maximum_stock') {
          value = Number(value) || 0; // Default to 0 if parsing fails
      }
      setFormData(prev => ({ ...prev, [field]: value }));
   };


  // Removed client-side getStatus

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation (using snake_case)
    if (!formData.item_name.trim() || !formData.location?.trim() || !formData.unit_price?.trim()) {
      toast({ title: "Validation Error", description: "Please fill in Item Name, Location, and Unit Price.", variant: "destructive" });
      return;
    }
    if (formData.current_stock < 0 || (formData.minimum_stock ?? 0) < 0 || (formData.maximum_stock ?? 0) < 0) {
        toast({ title: "Validation Error", description: "Stock values cannot be negative.", variant: "destructive"});
        return;
    }
    if ((formData.minimum_stock ?? 0) > (formData.maximum_stock ?? 0) && formData.maximum_stock !== 0) { // Allow max=0 if not set
      toast({ title: "Validation Error", description: "Minimum stock cannot exceed maximum stock.", variant: "destructive" });
      return;
    }

    // Prepare data to send (ensure nulls if empty, handle potential string->number conversion if needed)
    const dataToSend: NewItemData = {
        item_name: formData.item_name,
        category: formData.category || null,
        current_stock: Number(formData.current_stock) || 0,
        minimum_stock: Number(formData.minimum_stock) || null, // Send null if 0? Check backend.
        maximum_stock: Number(formData.maximum_stock) || null, // Send null if 0? Check backend.
        location: formData.location || null,
        unit_price: formData.unit_price || null, // Backend might expect format like '₹12.50'
        status: formData.status || null, // Let backend calculate status based on stock?
    };

    // Removed client-side itemCode generation and lastUpdated
    onAdd(dataToSend); // Call parent handler with snake_case data

    // Parent component handles success toast and closing dialog
    // Resetting form might happen automatically if dialog unmounts or parent handles it
    // setFormData({ ...initial state... });
    // onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>Enter the details for the new inventory item.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Use snake_case for id/htmlFor */}
          <div className="space-y-2">
            <Label htmlFor="item_name">Item Name *</Label>
            <Input id="item_name" value={formData.item_name} onChange={(e) => handleChange('item_name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category ?? ""} onValueChange={(value) => handleChange('category', value)}>
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                <SelectItem value="Fasteners">Fasteners</SelectItem>
                <SelectItem value="Sealing">Sealing</SelectItem>
                <SelectItem value="Components">Components</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Current Stock *</Label>
              <Input id="current_stock" type="number" min="0" value={formData.current_stock} onChange={(e) => handleChange('current_stock', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimum_stock">Minimum Stock</Label> {/* Not strictly required? */}
              <Input id="minimum_stock" type="number" min="0" value={formData.minimum_stock ?? ""} onChange={(e) => handleChange('minimum_stock', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maximum_stock">Maximum Stock</Label> {/* Not strictly required? */}
              <Input id="maximum_stock" type="number" min="0" value={formData.maximum_stock ?? ""} onChange={(e) => handleChange('maximum_stock', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input id="location" value={formData.location ?? ""} onChange={(e) => handleChange('location', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price *</Label>
              <Input id="unit_price" value={formData.unit_price ?? ""} onChange={(e) => handleChange('unit_price', e.target.value)} placeholder="₹0.00" required />
            </div>
             {/* Optional: Add initial Status field if needed */}
             {/* <div className="space-y-2">
                 <Label htmlFor="status">Initial Status</Label>
                 <Select value={formData.status ?? ""} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="In Stock">In Stock</SelectItem>
                        <SelectItem value="Low Stock">Low Stock</SelectItem>
                        <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                 </Select>
             </div> */}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add Item</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}