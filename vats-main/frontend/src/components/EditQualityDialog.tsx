import { useState, useEffect } from "react"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

// Interface for the data being edited (matches parent/DB structure)
interface QualityInspection {
    inspection_id: string;
    product_name: string;
    batch_number: string;
    inspection_date: string; // Expecting clean YYYY-MM-DD from backend
    inspector: string;
    test_type: string;
    result: string;
    defect_count: number;
    notes: string;
}

interface EditQualityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: QualityInspection | null;
  onSave: (inspection: QualityInspection) => void; 
}

// Helper function for local date (used for min date and fallback)
const getLocalTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
// ----------------------------------------------------------------------

export function EditQualityDialog({ open, onOpenChange, inspection, onSave }: EditQualityDialogProps) {
  // State for editable fields
  const [formData, setFormData] = useState({
    inspection_date: "",
    inspector: "",
    test_type: "",
    result: "",
    defect_count: 0,
    notes: "",
  });

  // Use useEffect to update form state when the inspection prop changes
  useEffect(() => {
    if (inspection) {
      setFormData({
        // The date string is now received clean ('YYYY-MM-DD') from the backend
        inspection_date: inspection.inspection_date || getLocalTodayDate(), 
        inspector: inspection.inspector || "",
        test_type: inspection.test_type || "",
        result: inspection.result || "",
        defect_count: inspection.defect_count || 0,
        notes: inspection.notes || "",
      });
    } else {
         setFormData({
             inspection_date: "", inspector: "", test_type: "", result: "", defect_count: 0, notes: ""
         });
    }
  }, [inspection, open]); 

  // Logic to determine if defect count should be disabled/reset
  const isDefectCountDisabled = formData.result === 'Pass';


  // Generic handler for form changes
  const handleChange = (field: keyof typeof formData, value: string | number) => {
     
     if (field === 'result') {
         if (value === 'Pass') {
             setFormData(prev => ({
                 ...prev,
                 [field]: value,
                 defect_count: 0 
             }));
             return; 
         }
     }
     
     setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspection) return; 

    if (formData.defect_count < 0) {
      toast({
        title: "Validation Error",
        description: "Defect count cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    const updatedInspection: QualityInspection = {
      ...inspection, 
      inspection_date: formData.inspection_date, // Send the clean YYYY-MM-DD string back
      inspector: formData.inspector,
      test_type: formData.test_type,
      result: formData.result,
      defect_count: formData.defect_count,
      notes: formData.notes,
    };

    onSave(updatedInspection);
  };

  if (!inspection) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Inspection - {inspection.inspection_id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Disabled fields */}
          <div className="space-y-2">
            <Label>Inspection ID</Label>
            <Input value={inspection.inspection_id} disabled />
          </div>
          <div className="space-y-2">
            <Label>Product Name</Label>
            <Input value={inspection.product_name} disabled />
          </div>
          <div className="space-y-2">
            <Label>Batch Number</Label>
            <Input value={inspection.batch_number} disabled />
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_inspection_date">Inspection Date *</Label>
              <Input
                id="edit_inspection_date"
                type="date"
                value={formData.inspection_date}
                onChange={(e) => handleChange('inspection_date', e.target.value)}
                // Enforce "no past dates"
                min={getLocalTodayDate()} 
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_inspector">Inspector *</Label>
              <Input
                id="edit_inspector"
                value={formData.inspector}
                onChange={(e) => handleChange('inspector', e.target.value)}
                placeholder="Inspector name"
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_test_type">Test Type *</Label>
            <Select value={formData.test_type} onValueChange={(value) => handleChange('test_type', value)}>
              <SelectTrigger id="edit_test_type">
                <SelectValue placeholder="Select test type"/>
              </SelectTrigger>
              <SelectContent>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_result">Result *</Label>
              <Select value={formData.result} onValueChange={(value) => handleChange('result', value)}>
                <SelectTrigger id="edit_result">
                   <SelectValue placeholder="Select result"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_defect_count">Defect Count *</Label>
              <Input
                id="edit_defect_count"
                type="number"
                min="0"
                value={formData.defect_count} 
                onChange={(e) => handleChange('defect_count', parseInt(e.target.value) || 0)}
                required
                disabled={isDefectCountDisabled}
                className={isDefectCountDisabled ? "bg-gray-200 dark:bg-gray-700" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes</Label>
            <Textarea
              id="edit_notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Enter inspection notes (optional)"
              rows={3}
              maxLength={500}
            />
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
