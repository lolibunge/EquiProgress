
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getHorses as fetchHorsesService } from '@/services/horse';
import { getSessionsByHorseId } from '@/services/session';
import { getBlockById } from '@/services/firestore';
import type { Horse, SessionData, TrainingBlock } from '@/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AddHorseForm from './AddHorseForm'; // Assuming this exists for adding new horses

interface BlockDetailsCache {
  [blockId: string]: string | null; // Store block title or null if not found/loading
}

export default function HorseHistory() {
  const { currentUser } = useAuth();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [blockDetailsCache, setBlockDetailsCache] = useState<BlockDetailsCache>({});
  const [isLoadingHorses, setIsLoadingHorses] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);

  const fetchHorses = useCallback(async () => {
    if (!currentUser?.uid) return;
    setIsLoadingHorses(true);
    try {
      const userHorses = await fetchHorsesService(currentUser.uid);
      setHorses(userHorses);
      if (userHorses.length > 0 && !selectedHorse) {
        // Optionally pre-select first horse
        // setSelectedHorse(userHorses[0]); 
      } else if (userHorses.length === 0) {
        setSelectedHorse(null);
        setSessions([]);
      }
    } catch (error) {
      console.error("Error fetching horses:", error);
      // Consider adding a toast notification here
    } finally {
      setIsLoadingHorses(false);
    }
  }, [currentUser?.uid, selectedHorse]);

  useEffect(() => {
    fetchHorses();
  }, [fetchHorses]);

  const fetchBlockTitle = useCallback(async (blockId: string) => {
    if (blockDetailsCache[blockId] !== undefined) {
      return blockDetailsCache[blockId]; // Already fetched or attempted
    }
    try {
      const block = await getBlockById(blockId);
      const title = block?.title || 'Etapa Desconocida';
      setBlockDetailsCache(prev => ({ ...prev, [blockId]: title }));
      return title;
    } catch (error) {
      console.error(`Error fetching block title for ${blockId}:`, error);
      setBlockDetailsCache(prev => ({ ...prev, [blockId]: 'Error al cargar etapa' }));
      return 'Error al cargar etapa';
    }
  }, [blockDetailsCache]);

  useEffect(() => {
    const fetchSessionsAndDependentData = async () => {
      if (!selectedHorse || !currentUser?.uid) {
        setSessions([]);
        return;
      }
      setIsLoadingSessions(true);
      try {
        const fetchedSessions = await getSessionsByHorseId(selectedHorse.id);
        setSessions(fetchedSessions);
        // Pre-fetch block titles for all sessions
        const newBlockDetailsCache = { ...blockDetailsCache };
        let cacheUpdated = false;
        for (const session of fetchedSessions) {
          if (session.blockId && newBlockDetailsCache[session.blockId] === undefined) {
            const block = await getBlockById(session.blockId);
            newBlockDetailsCache[session.blockId] = block?.title || 'Etapa Desconocida';
            cacheUpdated = true;
          }
        }
        if(cacheUpdated) {
          setBlockDetailsCache(newBlockDetailsCache);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        // Consider adding a toast notification here
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchSessionsAndDependentData();
  }, [selectedHorse, currentUser?.uid, fetchBlockTitle, blockDetailsCache]);
  
  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    fetchHorses(); // Refresh horse list
  };

  return (
    <div className="container py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Historial de Sesiones</CardTitle>
          <CardDescription>Selecciona un caballo para ver su historial de entrenamiento.</CardDescription>
        </CardHeader>
        <CardContent>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto justify-between">
                {selectedHorse ? selectedHorse.name : "Seleccionar Caballo"}
                <Icons.chevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuLabel>Mis Caballos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isLoadingHorses ? (
                <DropdownMenuItem disabled>Cargando caballos...</DropdownMenuItem>
              ) : horses.length > 0 ? (
                horses.map((horse) => (
                  <DropdownMenuItem key={horse.id} onSelect={() => setSelectedHorse(horse)}>
                    {horse.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No hay caballos registrados</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsAddHorseDialogOpen(true)}>
                <Icons.plus className="mr-2 h-4 w-4" />
                Añadir Caballo Nuevo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {isLoadingSessions && (
        <div className="flex justify-center items-center py-8">
          <Icons.spinner className="h-8 w-8 animate-spin" />
          <p className="ml-2">Cargando sesiones...</p>
        </div>
      )}

      {!isLoadingSessions && selectedHorse && sessions.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <Icons.logo className="mx-auto h-12 w-12 text-muted-foreground mb-4" data-ai-hint="horse sad" />
            <p className="text-muted-foreground">No hay sesiones registradas para {selectedHorse.name}.</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingSessions && !selectedHorse && !isLoadingHorses && horses.length > 0 && (
         <Card>
          <CardContent className="py-6 text-center">
            <Icons.logo className="mx-auto h-12 w-12 text-muted-foreground mb-4" data-ai-hint="horse pointing" />
            <p className="text-muted-foreground">Por favor, selecciona un caballo para ver su historial.</p>
          </CardContent>
        </Card>
      )}
      
      {!isLoadingSessions && !selectedHorse && !isLoadingHorses && horses.length === 0 && (
         <Card>
          <CardContent className="py-6 text-center">
            <Icons.logo className="mx-auto h-12 w-12 text-muted-foreground mb-4" data-ai-hint="horse plus" />
            <p className="text-muted-foreground">No tienes caballos registrados. Añade uno para empezar.</p>
            <Button className="mt-4" onClick={() => setIsAddHorseDialogOpen(true)}>
              <Icons.plus className="mr-2 h-4 w-4" /> Añadir Caballo
            </Button>
          </CardContent>
        </Card>
      )}


      {!isLoadingSessions && selectedHorse && sessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Sesiones de {selectedHorse.name}</h2>
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <CardTitle>
                  Sesión del {format(session.date.toDate(), "PPP", { locale: es })}
                </CardTitle>
                <CardDescription>
                  Etapa: {blockDetailsCache[session.blockId] || <Icons.spinner className="inline-block h-4 w-4 animate-spin" />}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {session.overallNote && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Nota General:</strong> {session.overallNote}
                  </p>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/session/${session.id}`}>Ver Detalles de la Sesión</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Dialog open={isAddHorseDialogOpen} onOpenChange={setIsAddHorseDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Caballo</DialogTitle>
            <DialogDescription>
              Completa los detalles para registrar un nuevo caballo.
            </DialogDescription>
          </DialogHeader>
          <AddHorseForm 
            onSuccess={handleHorseAdded} 
            onCancel={() => setIsAddHorseDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
