"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect, useCallback } from "react";
import type { User } from 'firebase/auth';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { createSession } from "@/services/session";
import { getHorses as fetchHorsesService } from "@/services/horse";
import type { Horse } from "@/types/firestore";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AddHorseForm from "./AddHorseForm";
import { Icons } from "./icons";


const Dashboard = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [isLoadingHorses, setIsLoadingHorses] = useState(true);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());

  // Function to fetch horses
  const performFetchHorses = useCallback(async (uid: string) => {
    setIsLoadingHorses(true);
    try {
      const userHorses = await fetchHorsesService(uid);
      setHorses(userHorses);
    } catch (error) {
      console.error("Error fetching horses:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los caballos." });
      setHorses([]); // Clear horses on error
    } finally {
      setIsLoadingHorses(false);
    }
  }, [toast]); // fetchHorsesService is a stable import

  // Effect for fetching horses when currentUser.uid changes
  useEffect(() => {
    if (currentUser?.uid) {
      performFetchHorses(currentUser.uid);
    } else {
      setHorses([]); // Clear horses if no user
      setIsLoadingHorses(false); // Ensure loading state is reset
    }
  }, [currentUser?.uid, performFetchHorses]);

  // Effect for managing selectedHorse when the horses list changes
  useEffect(() => {
    if (horses.length > 0) {
      // If no horse is selected OR the currently selected horse is not in the new list
      if (!selectedHorse || !horses.some(h => h.id === selectedHorse.id)) {
        setSelectedHorse(horses[0]); // Select the first horse
      } else {
        // If a horse is selected and it's still in the list, update its data
        // This handles cases where the horse's details might have changed
        const updatedSelectedHorse = horses.find(h => h.id === selectedHorse.id);
        if (updatedSelectedHorse && JSON.stringify(updatedSelectedHorse) !== JSON.stringify(selectedHorse)) {
          setSelectedHorse(updatedSelectedHorse);
        }
      }
    } else {
      setSelectedHorse(null); // No horses, so no selection
    }
  }, [horses, selectedHorse]); // Rerun if horses list changes or selectedHorse itself changes (e.g., cleared)

  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) {
      performFetchHorses(currentUser.uid); // Re-fetch horse list
    }
  };

  const handleAddHorseCancel = () => {
    setIsAddHorseDialogOpen(false);
  };

  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Listado de Caballos */}
        <Card className="col-span-1 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mis Caballos</CardTitle>
              <CardDescription>
                Gestiona tus caballos aquí.
              </CardDescription>
            </div>
            <Dialog open={isAddHorseDialogOpen} onOpenChange={setIsAddHorseDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setIsAddHorseDialogOpen(true)}>
                  <Icons.plus className="mr-2 h-4 w-4" /> Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Añadir Nuevo Caballo</DialogTitle>
                  <DialogDescription>
                    Completa los detalles para registrar un nuevo caballo.
                  </DialogDescription>
                </DialogHeader>
                <AddHorseForm onSuccess={handleHorseAdded} onCancel={handleAddHorseCancel} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoadingHorses ? (
              <div className="space-y-2">
                <div className="h-10 bg-muted rounded animate-pulse"></div>
                <div className="h-10 bg-muted rounded animate-pulse"></div>
                <div className="h-10 bg-muted rounded animate-pulse w-2/3"></div>
              </div>
            ) : horses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tienes caballos registrados. ¡Añade uno!</p>
            ) : (
              <ul className="space-y-2">
                {horses.map((horse) => (
                  <li key={horse.id}>
                    <Button
                      variant={selectedHorse?.id === horse.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedHorse(horse)}
                    >
                      {horse.name}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Detalle de Caballo */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>{selectedHorse ? `Detalles de ${selectedHorse.name}` : "Selecciona un Caballo"}</CardTitle>
             {selectedHorse && <CardDescription>Edad: {selectedHorse.age} años, Sexo: {selectedHorse.sex}, Color: {selectedHorse.color}</CardDescription>}
          </CardHeader>
          <CardContent>
            {selectedHorse ? (
              <Tabs defaultValue="plan" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                  <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
                  <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
                </TabsList>
                <TabsContent value="plan">
                  <Card className="my-4">
                    <CardHeader>
                      <CardTitle>Plan de Entrenamiento</CardTitle>
                      <CardDescription>
                        Plan actual para {selectedHorse.name}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="multiple" collapsible>
                        <AccordionItem value="item-1">
                          <AccordionTrigger>Bloque 1: Calentamiento</AccordionTrigger>
                          <AccordionContent>
                            - Círculos amplios al paso (5 min)
                            <br />- Transiciones paso-trote (10 reps)
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                          <AccordionTrigger>Bloque 2: Trabajo Principal</AccordionTrigger>
                          <AccordionContent>
                            - Serpentinas de 3 bucles al trote (4 reps)
                            <br />- Cesión a la pierna (5 min cada mano)
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      <div className="flex justify-end mt-4 space-x-2">
                        <Button variant="outline">Editar Plan</Button>
                        <Button variant="outline">Clonar Plan</Button>
                        <Button>Añadir Ejercicio</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="sesiones">
                  <Card className="my-4">
                    <CardHeader>
                      <CardTitle>Registrar Nueva Sesión</CardTitle>
                       <CardDescription>Para {selectedHorse.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">Seleccionar Bloque</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full">
                          <DropdownMenuLabel>Bloques del Plan</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Bloque 1: Calentamiento</DropdownMenuItem>
                          <DropdownMenuItem>Bloque 2: Trabajo Principal</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">Seleccionar Ejercicio</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full">
                          <DropdownMenuLabel>Ejercicios del Bloque</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Círculos amplios al paso</DropdownMenuItem>
                          <DropdownMenuItem>Transiciones paso-trote</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div>
                        <Label className="text-sm font-medium">Repeticiones sugeridas: 10</Label>
                      </div>
                      <div>
                        <Label htmlFor="rating-slider" className="text-sm font-medium">Calificación de la Sesión (1-5):</Label>
                        <Slider id="rating-slider" defaultValue={[3]} min={1} max={5} step={1} className="mt-2" />
                      </div>
                       <div className="flex justify-end mt-2">
                        <Button
                            disabled={!date || !selectedHorse}
                            onClick={async () => {
                                if (date && selectedHorse && selectedHorse.id) {
                                const sessionData = {
                                    date: date.toISOString().split("T")[0],
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    horse: selectedHorse.id,
                                    duration: 60, // Placeholder
                                    notes: "", // Placeholder
                                };
                                const result = await createSession(sessionData);
                                if (result) {
                                    window.location.href = `/session/${result}`;
                                } else {
                                    toast({variant: "destructive", title: "Error", description:"Error al crear la sesión. Por favor, revisa la consola."});
                                }
                                } else {
                                     toast({variant: "destructive", title: "Error", description:"Por favor, selecciona un caballo y una fecha."});
                                }
                            }}              
                            >Guardar Sesión</Button>
                        </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="observaciones">
                  <Card className="my-4">
                    <CardHeader>
                      <CardTitle>Observaciones de Tensión</CardTitle>
                      <CardDescription>Para {selectedHorse.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <Label className="text-sm font-medium">Checklist de zonas (próximamente)</Label>
                      <Label htmlFor="tension-notes" className="text-sm font-medium">Notas Adicionales</Label>
                      <Input id="tension-notes" type="text" placeholder="Añade notas sobre tensión, comportamiento, etc." />
                      <Button variant="outline">Añadir Foto (próximamente)</Button>
                       <div className="flex justify-end mt-2">
                        <Button>Guardar Observación</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Icons.logo className="w-16 h-16 mb-4 text-muted-foreground" /> 
                <p className="text-muted-foreground">Selecciona un caballo de la lista para ver sus detalles o añade uno nuevo.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Calendar Card */}
        <Card className="col-span-1 md:col-span-3 lg:col-span-1">
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
            <CardDescription>
              Resumen de sesiones y eventos.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow"
            />
            {date ? (
              <p className="text-center text-sm font-medium">
                Fecha seleccionada: {date.toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Selecciona una fecha.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
