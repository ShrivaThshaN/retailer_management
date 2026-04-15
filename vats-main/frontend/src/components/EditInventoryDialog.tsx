import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Added Desc
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Keep Select if status is editable
import { toast } from "@/hooks/use-toast";
// Removed mockData import and sync function

// Interface matching DB structure (snake_case)
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

interface EditInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null; // Use specific type
  onSave: (item: InventoryItem) => void; // Use specific type
}

export function EditInventoryDialog({ open, onOpenChange, item, onSave }: EditInventoryDialogProps) {
  // State for editable fields (use snake_case)
  const [formData, setFormData] = useState({
    current_stock: 0,
    minimum_stock: 0,
    maximum_stock: 0,
    location: "",
    unit_price: "",
    status: "", // Include status if it should be manually editable
  });

  // Update form state when item prop changes
  useEffect(() => {
    if (item) {
      setFormData({
        current_stock: item.current_stock || 0,
        minimum_stock: item.minimum_stock || 0,
        maximum_stock: item.maximum_stock || 0,
        location: item.location || "",
        unit_price: item.unit_price || "",
        status: item.status || "N/A", // Default status if null
      });
    } else {
        // Reset if item becomes null
        setFormData({ current_stock: 0, minimum_stock: 0, maximum_stock: 0, location: "", unit_price: "", status: "" });
    }
  }, [item, open]); // Depend on item and open state

  // Removed getStatus calculation

   // Generic handler
   const handleChange = (field: keyof typeof formData, value: string | number | null) => {
      // Ensure numeric fields remain numbers
      if (field === 'current_stock' || field === 'minimum_stock' || field === 'maximum_stock') {
          value = Number(value) || 0;
      }
      setFormData(prev => ({ ...prev, [field]: value }));
   };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return; // Should not happen

    // Validation
    if (formData.current_stock < 0 || formData.minimum_stock < 0 || formData.maximum_stock < 0) {
      toast({ title: "Validation Error", description: "Stock values cannot be negative.", variant: "destructive" });
      return;
    }
    if (formData.minimum_stock > formData.maximum_stock && formData.maximum_stock !== 0) {
      toast({ title: "Validation Error", description: "Minimum stock cannot exceed maximum stock.", variant: "destructive" });
      return;
    }
     if (!formData.location?.trim() || !formData.unit_price?.trim()) {
      toast({ title: "Validation Error", description: "Location and Unit Price are required.", variant: "destructive" });
      return;
    }


    // Construct the updated object, including non-editable fields
    const updatedItem: InventoryItem = {
      ...item, // Keep original item_code, item_name, category, last_updated
      current_stock: formData.current_stock,
      minimum_stock: formData.minimum_stock,
      maximum_stock: formData.maximum_stock,
      location: formData.location,
      unit_price: formData.unit_price,
      // Recalculate status based on new stock values before sending,
      // or let backend handle status update based on stock received.
      // For now, allow manual setting via form:
      status: formData.status,
      // Backend should ideally set last_updated on successful PUT
    };

    // Removed direct mockData update and sync function call

    // Call parent onSave handler with the full updated object
    onSave(updatedItem);

    // Parent component should handle success toast and closing dialog
    // onOpenChange(false);
  };

  // Render nothing if item is null
  if (!item) {
      return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item - {item.item_name}</DialogTitle>
           <DialogDescription>Update stock levels, location, price, and status for {item.item_code}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Disabled Fields */}
          <div className="space-y-2">
            <Label>Item Code</Label>
            <Input value={item.item_code} disabled />
          </div>
          <div className="space-y-2">
            <Label>Item Name</Label>
            <Input value={item.item_name} disabled />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={item.category || 'N/A'} disabled />
          </div>

          {/* Editable Fields (use snake_case for id/htmlFor) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_current_stock">Current Stock *</Label>
              <Input id="edit_current_stock" type="number" min="0" value={formData.current_stock} onChange={(e) => handleChange('current_stock', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_minimum_stock">Minimum Stock</Label>
              <Input id="edit_minimum_stock" type="number" min="0" value={formData.minimum_stock ?? ""} onChange={(e) => handleChange('minimum_stock', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_maximum_stock">Maximum Stock</Label>
              <Input id="edit_maximum_stock" type="number" min="0" value={formData.maximum_stock ?? ""} onChange={(e) => handleChange('maximum_stock', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_location">Location *</Label>
              <Input id="edit_location" value={formData.location ?? ""} onChange={(e) => handleChange('location', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_unit_price">Unit Price *</Label>
              <Input id="edit_unit_price" value={formData.unit_price ?? ""} onChange={(e) => handleChange('unit_price', e.target.value)} placeholder="₹0.00" required />
            </div>
          </div>

            {/* Optional: Add Status dropdown if manually editable */}
            <div className="space-y-2">
                 <Label htmlFor="edit_status">Status</Label>
                 <Select value={formData.status ?? ""} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger id="edit_status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="In Stock">In Stock</SelectItem>
                        <SelectItem value="Low Stock">Low Stock</SelectItem>
                        <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                 </Select>
                 <p className="text-xs text-muted-foreground">Note: Status might be automatically recalculated by the system based on stock levels.</p>
             </div>


          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
