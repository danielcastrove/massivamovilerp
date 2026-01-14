"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DollarSign, AlertCircle, Loader, CheckCircle, PlusCircle, Trash2 } from 'lucide-react';

interface PriceList {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface ProductPrice {
  product_id: string;
  price_usd: number;
}

export function AssignPricesTab() {
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [prices, setPrices] = useState<{ [productId: string]: number | string }>({});
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState<boolean>(true);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // State for linking new products
  const [isLinkDialogOpen, setLinkDialogOpen] = useState(false);
  const [productToLink, setProductToLink] = useState<string | null>(null);


  async function fetchPrices() {
    if (!selectedList) return;

    setLoadingPrices(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const response = await fetch(`/api/productprices?price_list_id=${selectedList}`);
      if (!response.ok) throw new Error('No se pudieron cargar los precios.');
      
      const data: ProductPrice[] = await response.json();
      const pricesMap = data.reduce((acc, price) => {
        acc[price.product_id] = price.price_usd;
        return acc;
      }, {} as { [productId: string]: number });
      setPrices(pricesMap);
    } catch (error: any) {
      setSaveError(error.message || "Error al cargar los precios.");
    } finally {
      setLoadingPrices(false);
    }
  }

  useEffect(() => {
    async function fetchInitialData() {
      setLoadingInitialData(true);
      try {
        const [priceListsRes, productsRes] = await Promise.all([
          fetch('/api/pricelists'),
          fetch('/api/products'),
        ]);
        if (!priceListsRes.ok || !productsRes.ok) throw new Error('No se pudieron cargar los datos iniciales.');
        setPriceLists(await priceListsRes.json());
        setAllProducts(await productsRes.json());
      } catch (error) { console.error("Error fetching initial data:", error); } 
      finally { setLoadingInitialData(false); }
    }
    fetchInitialData();
  }, []);
  
  useEffect(() => {
    async function fetchBcvRate() {
      setLoadingRate(true);
      try {
        const response = await fetch('/api/parametros');
        if (!response.ok) throw new Error('No se pudo obtener la tasa de cambio');
        setBcvRate(await response.json());
      } catch (error) { console.error("Error fetching BCV rate:", error); } 
      finally { setLoadingRate(false); }
    }
    fetchBcvRate();
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [selectedList]);

  const { linkedProducts, unlinkedProducts } = useMemo(() => {
    const linkedIds = Object.keys(prices);
    const linked = allProducts.filter(p => linkedIds.includes(p.id));
    const unlinked = allProducts.filter(p => !linkedIds.includes(p.id));
    return { linkedProducts: linked, unlinkedProducts: unlinked };
  }, [allProducts, prices]);


  const handlePriceChange = (productId: string, value: string) => {
    const numericValue = value === '' ? '' : parseFloat(value);
    if (isNaN(numericValue as number) && value !== '') return;
    setPrices(prev => ({ ...prev, [productId]: numericValue }));
  };

  const handleSavePrices = async () => {
    if (!selectedList) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const response = await fetch('/api/productprices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_list_id: selectedList, prices }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Error al guardar.');
      setSaveSuccess("Precios guardados correctamente.");
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkProduct = async () => {
    if (!productToLink || !selectedList) return;
    setIsSaving(true);
    try {
        // Create a new link with a default price of 0
        const newPrices = { ...prices, [productToLink]: 0 };
        const response = await fetch('/api/productprices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price_list_id: selectedList, prices: newPrices }),
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Error al enlazar.');
        
        await fetchPrices(); // Re-fetch prices to update the table
        setLinkDialogOpen(false);
        setProductToLink(null);

    } catch(error: any) {
        setSaveError(error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleUnlinkProduct = async (productId: string) => {
    if (!selectedList) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const response = await fetch('/api/productprices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_list_id: selectedList, product_id: productId }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Error al desenlazar.');
      setSaveSuccess("Producto desenlazado correctamente.");
      await fetchPrices(); // Re-fetch prices to update the table
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

  return (
    <>
      {/* Link Product Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enlazar Producto a la Lista</DialogTitle>
            <DialogDescription>
              Selecciona un producto para añadirlo a esta lista de precios. Se le asignará un precio inicial de $0.00.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setProductToLink}>
              <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
              <SelectContent>
                {unlinkedProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleLinkProduct} disabled={!productToLink || isSaving} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : null} Enlazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>1. Seleccionar Lista</CardTitle>
              <CardDescription>Elige la lista de precios que deseas editar.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInitialData ? <div className="flex justify-center h-10"><Loader className="h-6 w-6 animate-spin"/></div> : (
                <Select onValueChange={setSelectedList} value={selectedList || undefined}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar una lista..." /></SelectTrigger>
                  <SelectContent>{priceLists.map(list => <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </CardContent>
            <CardFooter>
              <Alert><DollarSign className="h-4 w-4" /><AlertTitle>Tasa de Cambio (BCV)</AlertTitle><AlertDescription>{loadingRate ? 'Cargando...' : bcvRate ? `1 USD = ${formatCurrency(bcvRate)}` : "No disponible"}</AlertDescription></Alert>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className={!selectedList ? "bg-gray-50 dark:bg-gray-900" : ""}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>2. Asignar Precios</CardTitle>
                        <CardDescription>
                        {selectedList ? `Editando precios para la lista "${priceLists.find(l => l.id === selectedList)?.name}"` : "Selecciona una lista."}
                        </CardDescription>
                    </div>
                    {selectedList && <Button size="sm" onClick={() => setLinkDialogOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white"><PlusCircle className="mr-2 h-4 w-4"/>Enlazar Producto</Button>}
                </div>
            </CardHeader>
            <CardContent>
              {loadingPrices ? <div className="flex justify-center h-40"><Loader className="h-8 w-8 animate-spin"/></div> : selectedList ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Precio (USD)</TableHead><TableHead className="text-right">Precio Aprox. (Bs)</TableHead><TableHead className="text-center">Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {linkedProducts.length > 0 ? linkedProducts.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          <Input type="number" placeholder="0.00" value={prices[service.id] || ''} onChange={(e) => handlePriceChange(service.id, e.target.value)} disabled={!bcvRate || isSaving} />
                        </TableCell>
                        <TableCell className="text-right font-mono">{bcvRate ? formatCurrency((Number(prices[service.id]) || 0) * bcvRate) : '...'}</TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => handleUnlinkProduct(service.id)} 
                            disabled={isSaving}
                            title="Desenlazar Producto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">No hay productos enlazados a esta lista.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : <div className="text-center h-40 content-center text-sm text-muted-foreground">Selecciona una lista de precios.</div>}
            </CardContent>
            {selectedList && linkedProducts.length > 0 && (
              <CardFooter className="flex flex-col items-end gap-4 pt-4">
                  {saveSuccess && <Alert className="w-full"><CheckCircle className="h-4 w-4" /><AlertTitle>Éxito</AlertTitle><AlertDescription>{saveSuccess}</AlertDescription></Alert>}
                  {saveError && <Alert variant="destructive" className="w-full"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{saveError}</AlertDescription></Alert>}
                <Button onClick={handleSavePrices} disabled={!bcvRate || loadingPrices || isSaving} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                  {isSaving ? <><Loader className="h-4 w-4 animate-spin mr-2" />Guardando...</> : "Guardar Precios"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}