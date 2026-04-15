import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ERPLayout } from "./components/ERPLayout";
import Dashboard from "./pages/Dashboard";
import MasterProductionSchedule from "./pages/MasterProductionSchedule";
import MaterialRequirementPlanning from "./pages/MaterialRequirementPlanning";
import Procurement from "./pages/Procurement";
import OrderManagement from "./pages/OrderManagement";
import Inventory from "./pages/Inventory";
import Logistics from "./pages/Logistics";
import Quality from "./pages/Quality";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ERPLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/production/master-schedule" element={<MasterProductionSchedule />} />
            <Route path="/production/material-planning" element={<MaterialRequirementPlanning />} />
            <Route path="/procurement" element={<Procurement />} />
            <Route path="/order-management" element={<OrderManagement />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/quality" element={<Quality />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ERPLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
