import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Import Footer
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Interface for data passed back (snake_case)
export interface NewMaterialData {
    material_name: string;
    supplier: string;
    required_qty: number;
    lead_time: number; // Send as number
    status: string;
    planned_date: string; // YYYY-MM-DD string
    related_order: string;
}

interface NewMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (materialBaseData: NewMaterialData) => void;
}

export function NewMaterialDialog({ open, onOpenChange, onAdd }: NewMaterialDialogProps) {
  // Use snake_case for state keys
  const [formData, setFormData] = useState<NewMaterialData>({
    material_name: "",
    supplier: "",
    required_qty: 0,
    lead_time: 0,
    status: "Required",
    planned_date: new Date().toISOString().split('T')[0],
    related_order: "",
  });

   // Reset form when dialog opens
   useEffect(() => {
    if (open) {
        setFormData({
            material_name: "",
            supplier: "",
            required_qty: 0,
            lead_time: 0,
            status: "Required",
            planned_date: new Date().toISOString().split('T')[0],
            related_order: "",
        });
    }
  }, [open]);

  const handleChange = (field: keyof NewMaterialData, value: string | number) => {
     if (field === 'required_qty' || field === 'lead_time') {
          value = Number(value) || 0;
     }
     setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.material_name.trim() || !formData.supplier.trim() || !formData.planned_date) {
      toast({ title: "Validation Error", description: "Please fill in Material Name, Supplier, and Planned Date.", variant: "destructive" });
      return;
    }
    if (formData.required_qty <= 0 || formData.lead_time < 0) {
      toast({ title: "Validation Error", description: "Required Qty must be > 0, Lead Time must be >= 0.", variant: "destructive" });
      return;
    }
    onAdd(formData); // Pass snake_case data
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Material Requirement</DialogTitle>
              <DialogDescription>Manually add a material needed for production or stock.</DialogDescription>
            </DialogHeader>
            {/* Scrollable Area */}
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label htmlFor="material_name">Material Name *</Label>
                <Input id="material_name" value={formData.material_name} onChange={(e) => handleChange('material_name', e.target.value)} placeholder="Enter material name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Input id="supplier" value={formData.supplier} onChange={(e) => handleChange('supplier', e.target.value)} placeholder="Enter supplier name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="required_qty">Required Quantity *</Label>
                <Input id="required_qty" type="number" min="1" value={formData.required_qty || ""} onChange={(e) => handleChange('required_qty', parseInt(e.target.value) || 0)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_time">Lead Time (days) *</Label>
                  <Input id="lead_time" type="number" min="0" value={formData.lead_time || ""} onChange={(e) => handleChange('lead_time', parseInt(e.target.value) || 0)} placeholder="e.g., 5" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value as string)}>
                    <SelectTrigger id="status"><SelectValue placeholder="Select Status"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Required">Required</SelectItem>
                      <SelectItem value="Ordered">Ordered</SelectItem>
                      <SelectItem value="Received">Received</SelectItem>
                      <SelectItem value="Shortage">Shortage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planned_date">Planned Date *</Label>
                  <Input id="planned_date" type="date" value={formData.planned_date} onChange={(e) => handleChange('planned_date', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="related_order">Related Order</Label>
                  <Input id="related_order" value={formData.related_order} onChange={(e) => handleChange('related_order', e.target.value)} placeholder="e.g., CO-2025-001"/>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Add Material Requirement</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}