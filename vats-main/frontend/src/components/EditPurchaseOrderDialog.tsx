import { useState, useEffect } from "react";
// ✅ Import DialogFooter and DialogDescription
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns"; 
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ✅ Interface MUST match the backend/Procurement.tsx (snake_case)
export interface ProcurementOrder {
  po_number: string;
  supplier: string | null;
  material_name: string;
  item_code: string | null;
  quantity: number;
  unit_price: string | null;
  total_amount: string | null;
  order_date: string | null;
  expected_delivery: string | null;
  status: string;
  related_order?: string | null;
}

interface EditPurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProcurementOrder | null; // Expects snake_case object
  onOrderUpdated: (updatedOrder: ProcurementOrder) => void;
}

export const EditPurchaseOrderDialog = ({ open, onOpenChange, order, onOrderUpdated }: EditPurchaseOrderDialogProps) => {
  // Internal state for editable fields
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [status, setStatus] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const today = new Date(); today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (order) {
      setQuantity(order.quantity || 0);
      const priceString = String(order.unit_price || '0').replace(/[₹,]/g, '');
      setUnitPrice(parseFloat(priceString) || 0);
      try {
          setDeliveryDate(order.expected_delivery ? parseISO(order.expected_delivery) : undefined);
      } catch (e) {
          console.error("Error parsing delivery date:", order.expected_delivery, e);
          setDeliveryDate(undefined);
      }
      setStatus(order.status || "");
      setShowConfirmDialog(false);
      setPendingStatus("");
    } else {
        // Reset form if order becomes null
        setQuantity(0); setUnitPrice(0); setDeliveryDate(undefined); setStatus("");
        setShowConfirmDialog(false); setPendingStatus("");
    }
  }, [order, open]); // Re-run when order or open state changes

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "Received" && status !== "Received") {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
    } else {
      setStatus(newStatus);
      setPendingStatus("");
      setShowConfirmDialog(false);
    }
  };

  const handleConfirmReceipt = () => {
    if (pendingStatus === "Received") { setStatus(pendingStatus); }
    setShowConfirmDialog(false);
    setPendingStatus("");
  };

  const handleCancelConfirm = () => {
      setPendingStatus("");
      setShowConfirmDialog(false);
  };

  const handleSubmit = (e: React.FormEvent) => { // Added FormEvent
    e.preventDefault(); // Prevent default form submission
    if (!order) return;

    if (quantity <= 0 || unitPrice < 0 || !deliveryDate || !status) {
      toast({ title: "Error", description: "Please fill fields correctly (Qty > 0, Price >= 0).", variant: "destructive" }); return;
    }
     const deliveryDay = new Date(deliveryDate); deliveryDay.setHours(0,0,0,0);
     if (deliveryDay < today) {
          toast({ title: "Error", description: "Delivery date cannot be in the past.", variant: "destructive" }); return;
     }

    const updatedOrderData: ProcurementOrder = {
      ...order,
      quantity: quantity,
      unit_price: `₹${unitPrice.toFixed(2)}`,
      total_amount: `₹${(quantity * unitPrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
      expected_delivery: format(deliveryDate, 'yyyy-MM-dd'),
      status: status,
    };

    onOrderUpdated(updatedOrderData);
    onOpenChange(false);
  };

  if (!order) return null;

  return (
    <> {/* Use Fragment to hold both Dialogs */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          {/* ✅ Form wraps Header, Content Div, and Footer */}
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Purchase Order</DialogTitle>
              <DialogDescription> Update details for PO {order.po_number}. </DialogDescription>
            </DialogHeader>

            {/* ✅ This div holds all inputs and becomes scrollable */}
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1 md:px-0">
              {/* Read-only fields */}
              <div className="space-y-2"><Label className="text-muted-foreground" htmlFor="ro_po_number">PO Number</Label><Input id="ro_po_number" value={order.po_number} disabled className="bg-muted"/></div>
              <div className="space-y-2"><Label className="text-muted-foreground" htmlFor="ro_supplier">Vendor</Label><Input id="ro_supplier" value={order.supplier ?? 'N/A'} disabled className="bg-muted"/></div>
              <div className="space-y-2"><Label className="text-muted-foreground" htmlFor="ro_material_name">Material</Label><Input id="ro_material_name" value={order.material_name} disabled className="bg-muted"/></div>
              <div className="space-y-2"><Label className="text-muted-foreground" htmlFor="ro_item_code">Item Code</Label><Input id="ro_item_code" value={order.item_code || 'N/A'} disabled className="bg-muted"/></div>

              {/* Editable fields */}
              <div className="space-y-2">
                <Label htmlFor="edit_quantity">Quantity *</Label>
                <Input id="edit_quantity" type="number" min="1" value={quantity || ""} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_unitPrice">Unit Price (₹) *</Label>
                <Input id="edit_unitPrice" type="number" min="0" step="0.01" value={unitPrice || ""} onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_deliveryDate">Expected Delivery Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="edit_deliveryDate" variant="outline" className={cn("w-full justify-start text-left font-normal", !deliveryDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(date) => date < today} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status *</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="edit_status"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Ordered">Ordered</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div> {/* ✅ End of scrollable div */}

            {/* ✅ Footer is now outside the scrollable div */}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Update Order</Button>
            </DialogFooter>
          </form> {/* ✅ End of form */}

        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog remains separate */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Material Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Setting status to "Received" will trigger inventory update for <strong>{order.material_name} ({order.item_code || 'N/A'})</strong> by <strong>{quantity}</strong> units. Proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirm}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReceipt}>Confirm Receipt</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
