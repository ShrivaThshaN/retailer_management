// src/components/NewQualityDialog.tsx
import { useState } from "react"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

// Interface for the data passed back to the parent
interface NewInspectionData {
  product_name: string; 
  batch_number: string;
  inspection_date: string;
  inspector: string;
  test_type: string;
  result: string;
  defect_count: number;
  notes: string;
}

interface NewQualityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (inspectionData: NewInspectionData) => void;
}

// Helper to get today's date in YYYY-MM-DD format for the date input default
const getLocalTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
// ----------------------------------------------------------------------


export function NewQualityDialog({ open, onOpenChange, onAdd }: NewQualityDialogProps) {
  const [formData, setFormData] = useState<NewInspectionData>({
    product_name: "",
    batch_number: "",
    inspection_date: getLocalTodayDate(), // Default to today
    inspector: "",
    test_type: "Dimensional Check", // Default
    result: "Pass", // Default
    defect_count: 0,
    notes: "",
  });

  // State to disable defect count if result is 'Pass'
  const isDefectCountDisabled = formData.result === 'Pass' || formData.result === 'Pending';
  
  // Reset form data when the dialog opens
  // This replaces the useEffect and ensures a clean state without errors
  if (open && formData.product_name !== "" && !formData.inspection_date) {
      setFormData({
        product_name: "",
        batch_number: "",
        inspection_date: getLocalTodayDate(),
        inspector: "",
        test_type: "Dimensional Check",
        result: "Pass",
        defect_count: 0,
        notes: "",
      });
  }


  // Handle change for all input types
  const handleChange = (field: keyof NewInspectionData, value: string | number) => {
    setFormData(prev => {
        const newState = { ...prev, [field]: value };
        
        // Logic to reset defect_count if result is set to 'Pass' or 'Pending'
        if (field === 'result' && (value === 'Pass' || value === 'Pending')) {
            newState.defect_count = 0;
        }

        return newState;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.product_name || !formData.batch_number || !formData.inspector || !formData.inspection_date) {
        toast({
            title: "Validation Error",
            description: "Please fill in all required fields (Product Name, Batch No, Date, Inspector).",
            variant: "destructive",
        });
        return;
    }
    
    // Ensure defect_count is 0 if result is 'Pass' or 'Pending'
    const dataToSend = { ...formData };
    if (isDefectCountDisabled) {
        dataToSend.defect_count = 0;
    }

    onAdd(dataToSend);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quality Inspection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* ⭐ REVERTED: Product Name back to a standard Input */}
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => handleChange('product_name', e.target.value)}
                placeholder="Enter Product Name (Must exist in Customer Orders)"
                required
                maxLength={100}
              />
            </div>
            {/* End Product Name Input */}

            <div className="space-y-2">
              <Label htmlFor="batch_number">Batch Number *</Label>
              <Input
                id="batch_number"
                value={formData.batch_number}
                onChange={(e) => handleChange('batch_number', e.target.value)}
                placeholder="Enter Batch Number"
                required
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection_date">Inspection Date *</Label>
              <Input
                id="inspection_date"
                type="date"
                value={formData.inspection_date}
                onChange={(e) => handleChange('inspection_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector">Inspector *</Label>
              <Input
                id="inspector"
                value={formData.inspector}
                onChange={(e) => handleChange('inspector', e.target.value)}
                placeholder="Enter Inspector Name"
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test_type">Test Type *</Label>
              <Select value={formData.test_type} onValueChange={(value) => handleChange('test_type', value)}>
                <SelectTrigger id="test_type">
                  <SelectValue placeholder="Select Test Type" />
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

            <div className="space-y-2">
              <Label htmlFor="result">Result *</Label>
              <Select value={formData.result} onValueChange={(value) => handleChange('result', value)}>
                <SelectTrigger id="result">
                  <SelectValue placeholder="Select Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defect_count">Defect Count *</Label>
              <Input
                id="defect_count"
                type="number"
                min="0"
                value={formData.defect_count}
                onChange={(e) => handleChange('defect_count', parseInt(e.target.value) || 0)}
                required
                disabled={isDefectCountDisabled}
                className={isDefectCountDisabled ? "bg-gray-200 dark:bg-gray-700" : ""}
              />
            </div>
            
             <div className="col-span-2">
                {(formData.result === 'Pass' || formData.result === 'Pending') && (
                     <div className="flex items-center text-sm text-muted-foreground p-2 rounded-md bg-green-50 dark:bg-green-900/20 mt-4">
                         <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                         Defect Count is automatically set to 0 when the inspection result is 'Pass' or 'Pending'.
                     </div>
                 )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
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
            <Button type="submit">
              Create Inspection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
