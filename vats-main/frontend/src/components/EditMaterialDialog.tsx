import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Import Footer
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { parseISO, format } from "date-fns"; // Import date functions

// Interface matches DB structure (snake_case)
export interface MaterialRequirement {
    material_code: string;
    material_name: string;
    item_code: string | null;
    related_order: string | null;
    required_qty: number;
    available_qty?: number; // Comes from DB, but we don't edit
    shortfall?: number; // Comes from DB, but we don't edit
    supplier: string | null;
    lead_time: string | null;
    status: string;
    planned_date: string | null;
}

interface EditMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialRequirement | null;
  onSave: (material: MaterialRequirement) => void;
}

export function EditMaterialDialog({ open, onOpenChange, material, onSave }: EditMaterialDialogProps) {
  // State for editable fields (snake_case)
  const [formData, setFormData] = useState({
    required_qty: 0,
    supplier: "",
    lead_time: "", // Edit just the number part
    status: "",
    planned_date: "",
    related_order: "",
  });

  useEffect(() => {
    if (material) {
      // Parse "X days" string to just the number for the input
      const leadTimeValue = material.lead_time ? parseInt(material.lead_time, 10) || 0 : 0;
      
      setFormData({
        required_qty: material.required_qty || 0,
        supplier: material.supplier || "",
        lead_time: isNaN(leadTimeValue) ? "" : String(leadTimeValue),
        status: material.status || "",
        // Format date string from YYYY-MM-DD or full ISO
        planned_date: material.planned_date ? format(parseISO(material.planned_date), 'yyyy-MM-dd') : "",
        related_order: material.related_order || "",
      });
    }
  }, [material, open]); // Re-run if material changes or dialog opens

  const handleChange = (field: keyof typeof formData, value: string | number) => {
     setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!material) return;
    const requiredQtyNum = Number(formData.required_qty);
    if (requiredQtyNum <= 0) {
      toast({ title: "Validation Error", description: "Required Quantity must be greater than 0.", variant: "destructive" });
      return;
    }

    const updatedMaterial: MaterialRequirement = {
      ...material,
      required_qty: requiredQtyNum,
      supplier: formData.supplier || null,
      lead_time: formData.lead_time ? `${formData.lead_time} days` : null, // Format back to "X days"
      status: formData.status,
      planned_date: formData.planned_date || null,
      related_order: formData.related_order || null,
    };

    onSave(updatedMaterial);
  };

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Material - {material.material_name}</DialogTitle>
              <DialogDescription>Update details for {material.material_code}.</DialogDescription>
            </DialogHeader>
            
            {/* Scrollable content area */}
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              {/* Disabled Fields */}
              <div className="space-y-2"><Label>Material Code</Label><Input value={material.material_code} disabled className="bg-muted"/></div>
              <div className="space-y-2"><Label>Material Name</Label><Input value={material.material_name} disabled className="bg-muted"/></div>
              <div className="space-y-2"><Label>Linked Item Code</Label><Input value={material.item_code || 'N/A'} disabled className="bg-muted"/></div>

              {/* Editable Fields (use snake_case) */}
              <div className="space-y-2">
                  <Label htmlFor="edit_required_qty">Required Quantity *</Label>
                  <Input id="edit_required_qty" type="number" min="1" value={formData.required_qty || ""} onChange={(e) => handleChange('required_qty', parseInt(e.target.value) || 0)} required />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="edit_supplier">Supplier</Label>
                  <Input id="edit_supplier" value={formData.supplier ?? ""} onChange={(e) => handleChange('supplier', e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="edit_lead_time">Lead Time (days)</Label>
                  <Input id="edit_lead_time" type="number" min="0" value={formData.lead_time} onChange={(e) => handleChange('lead_time', e.target.value)} placeholder="e.g., 5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange('status', value as string)}>
                  <SelectTrigger id="edit_status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Ordered">Ordered</SelectItem>
                    <SelectItem value="Required">Required</SelectItem>
                    <SelectItem value="Shortage">Shortage</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="edit_planned_date">Planned Date *</Label>
                  <Input id="edit_planned_date" type="date" value={formData.planned_date} onChange={(e) => handleChange('planned_date', e.target.value)} required />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="edit_related_order">Related Order</Label>
                  <Input id="edit_related_order" value={formData.related_order ?? ""} onChange={(e) => handleChange('related_order', e.target.value)} />
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
