import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Import Footer
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns"; // Import parseISO
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ✅ Interface matches the database (snake_case)
export interface Schedule {
  schedule_id: string;
  product_name: string;
  order_number: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  priority: string;
  workstation: string;
  supervisor: string;
  status: string;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  progress?: number | null;
}

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null; // Expects snake_case
  onScheduleUpdated: (updatedSchedule: Schedule) => void; // Sends snake_case
}

export const EditScheduleDialog = ({ open, onOpenChange, schedule, onScheduleUpdated }: EditScheduleDialogProps) => {
  // Internal state for editable fields
  const [plannedStartDate, setPlannedStartDate] = useState<Date | undefined>();
  const [plannedEndDate, setPlannedEndDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [workstation, setWorkstation] = useState("");
  const [supervisor, setSupervisor] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (schedule) {
      try {
        setPlannedStartDate(schedule.planned_start_date ? parseISO(schedule.planned_start_date) : undefined);
        setPlannedEndDate(schedule.planned_end_date ? parseISO(schedule.planned_end_date) : undefined);
      } catch (e) {
          console.error("Error parsing schedule dates:", e);
          setPlannedStartDate(undefined);
          setPlannedEndDate(undefined);
      }
      setPriority(schedule.priority || "");
      setStatus(schedule.status || "");
      setWorkstation(schedule.workstation || "");
      setSupervisor(schedule.supervisor || "");
    }
  }, [schedule, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule) return;

    if (!plannedStartDate || !plannedEndDate || !priority || !status || !workstation || !supervisor) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (plannedEndDate < plannedStartDate) {
      toast({ title: "Error", description: "Planned end date must be after start date", variant: "destructive" });
      return;
    }

    const updatedSchedule: Schedule = {
      ...schedule,
      planned_start_date: format(plannedStartDate, 'yyyy-MM-dd'),
      planned_end_date: format(plannedEndDate, 'yyyy-MM-dd'),
      priority: priority,
      status: status,
      workstation: workstation,
      supervisor: supervisor,
    };

    onScheduleUpdated(updatedSchedule);
    onOpenChange(false);
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Production Schedule: {schedule.schedule_id}</DialogTitle>
            <DialogDescription>Update the production schedule details.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            {/* Read-only fields */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">Product</Label>
              <div className="col-span-3 text-sm font-medium">{schedule.product_name}</div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">Order Number</Label>
              <div className="col-span-3 text-sm font-medium">{schedule.order_number}</div>
            </div>
           
            {/* Editable fields */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_startDate" className="text-right">Planned Start *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="edit_startDate" variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !plannedStartDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {plannedStartDate ? format(plannedStartDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {/* Allow editing start date to be in the past */}
                  <Calendar mode="single" selected={plannedStartDate} onSelect={setPlannedStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_endDate" className="text-right">Planned End *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="edit_endDate" variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !plannedEndDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {plannedEndDate ? format(plannedEndDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={plannedEndDate} onSelect={setPlannedEndDate} disabled={(date) => (plannedStartDate && date < plannedStartDate)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_priority" className="text-right">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="edit_priority" className="col-span-3"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_workstation" className="text-right">Workstation *</Label>
                <Select value={workstation} onValueChange={setWorkstation}>
                    <SelectTrigger id="edit_workstation" className="col-span-3"><SelectValue placeholder="Select workstation" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Assembly Line A">Assembly Line A</SelectItem>
                        <SelectItem value="Fabrication Bay B">Fabrication Bay B</SelectItem>
                        <SelectItem value="Extrusion Line C">Extrusion Line C</SelectItem>
                        <SelectItem value="Motor Assembly D">Motor Assembly D</SelectItem>
                        <SelectItem value="Electronics Lab E">Electronics Lab E</SelectItem>
                        <SelectItem value="Hydraulics Bay F">Hydraulics Bay F</SelectItem>
                        <SelectItem value="Frame Assembly G">Frame Assembly G</SelectItem>
                        <SelectItem value="Welding Station 1">Welding Station 1</SelectItem>
                        <SelectItem value="Painting Booth">Painting Booth</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_supervisor" className="text-right">Supervisor *</Label>
                <Input id="edit_supervisor" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Enter supervisor name" className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_status" className="text-right">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="edit_status" className="col-span-3"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Delayed">Delayed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Update Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
