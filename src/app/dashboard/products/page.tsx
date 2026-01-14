import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServicesTab } from "@/components/products/ServicesTab";
import { PriceListsTab } from "@/components/products/PriceListsTab";
import { AssignPricesTab } from "@/components/products/AssignPricesTab";

export default function ProductsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Productos y Precios</h2>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">Servicios</TabsTrigger>
          <TabsTrigger value="price_lists" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">Listas de Precios</TabsTrigger>
          <TabsTrigger value="assign_prices" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">Asignar Precios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="services" className="space-y-4">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="price_lists" className="space-y-4">
          <PriceListsTab />
        </TabsContent>

        <TabsContent value="assign_prices" className="space-y-4">
          <AssignPricesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
