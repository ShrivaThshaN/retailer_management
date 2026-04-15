import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// Interface for data passed back to parent (uses snake_case)
export interface NewPOData {
    po_number: string;
    supplier: string;
    material_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number; // Calculated
    expected_delivery: Date;
    status: string;
}

interface NewPurchaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrderAdded: (newOrder: NewPOData) => void;
    initialPoNumber: string; 
}

export const NewPurchaseOrderDialog = ({ open, onOpenChange, onOrderAdded, initialPoNumber }: NewPurchaseOrderDialogProps) => {
    // Internal state uses snake_case
    const [supplier, setSupplier] = useState("");
    const [material_name, setMaterialName] = useState("");
    const [quantity, setQuantity] = useState<number | string>("");
    const [unit_price, setUnitPrice] = useState<number | string>("");
    const [expected_delivery, setDeliveryDate] = useState<Date | undefined>();
    const [po_number, setPoNumber] = useState(initialPoNumber); 

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    useEffect(() => {
        if (open) {
            setPoNumber(initialPoNumber);
            // Reset form
            setSupplier("");
            setMaterialName("");
            setQuantity("");
            setUnitPrice("");
            setDeliveryDate(undefined);
        }
    }, [open, initialPoNumber]);


    const handleSubmit = () => {
        if (!supplier || !material_name || !quantity || !unit_price || !expected_delivery) {
            toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" }); return;
        }
        const qtyNum = Number(quantity);
        const priceNum = Number(unit_price);
        if (isNaN(qtyNum) || qtyNum <= 0 || isNaN(priceNum) || priceNum < 0) {
            toast({ title: "Error", description: "Quantity (>0) and Unit Price (>=0) must be valid numbers.", variant: "destructive" }); return;
        }
        if (expected_delivery < today) {
             toast({ title: "Error", description: "Delivery date cannot be in the past.", variant: "destructive" }); return;
        }

        const newOrder: NewPOData = {
            po_number: po_number,
            supplier: supplier,
            material_name: material_name,
            quantity: qtyNum,
            unit_price: priceNum,
            total_amount: qtyNum * priceNum,
            expected_delivery: expected_delivery,
            status: "Pending" // Default status
        };

        onOrderAdded(newOrder); 
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                    <DialogDescription>Add a new purchase order to the system.</DialogDescription>
                </DialogHeader>
                {/* Use snake_case for id/htmlFor */}
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="po_number">PO Number</Label>
                        <Input id="po_number" value={po_number} disabled className="bg-muted"/>
                        <p className="text-xs text-muted-foreground">Auto-generated</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier">Vendor *</Label>
                        <Select value={supplier} onValueChange={setSupplier}>
                            <SelectTrigger id="supplier"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Rubber Industries">Rubber Industries</SelectItem>
                                <SelectItem value="MetalCraft Industries">MetalCraft Industries</SelectItem>
                                <SelectItem value="Titanium Tech Ltd">Titanium Tech Ltd</SelectItem>
                                {/* Add more vendors as needed */}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="material_name">Material *</Label>
                        <Input id="material_name" value={material_name} onChange={(e) => setMaterialName(e.target.value)} placeholder="Enter material name" required/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" required/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit_price">Unit Price (₹) *</Label>
                            <Input id="unit_price" type="number" value={unit_price} onChange={(e) => setUnitPrice(e.target.value)} min="0" step="0.01" required/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="expected_delivery">Expected Delivery Date *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="expected_delivery" variant="outline" className={cn("w-full justify-start text-left font-normal", !expected_delivery && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {expected_delivery ? format(expected_delivery, "PPP") : "Pick a date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={expected_delivery} onSelect={setDeliveryDate} disabled={(date) => date < today} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Create Order</Button> {/* Changed to type="submit" */}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
