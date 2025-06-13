
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
import AddHorseForm from './AddHorseForm';

interface BlockDetailsCache {
  [blockId: string]: string;
}

interface HorseHistoryProps {
  preselectedHorse?: Horse | null;
}

export default function HorseHistory({ preselectedHorse }: HorseHistoryProps) {
  const { currentUser } = useAuth();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(preselectedHorse || null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [blockDetailsCache, setBlockDetailsCache] = useState<BlockDetailsCache>({});
  const [isLoadingHorses, setIsLoadingHorses] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);

  const fetchHorses = useCallback(async () => {
    if (!currentUser?.uid || preselectedHorse) { // Don't fetch all horses if one is preselected
      setIsLoadingHorses(false);
      return;
    }
    setIsLoadingHorses(true);
    try {
      const userHorses = await fetchHorsesService(currentUser.uid);
      setHorses(userHorses);
      if (userHorses.length === 0) {
        setSelectedHorse(null);
        setSessions([]);
      }
    } catch (error) {
      console.error("Error fetching horses:", error);
    } finally {
      setIsLoadingHorses(false);
    }
  }, [currentUser?.uid, preselectedHorse]);

  useEffect(() => {
    if (preselectedHorse) {
      setSelectedHorse(preselectedHorse);
      setIsLoadingHorses(false); // No need to load other horses
    } else {
      fetchHorses();
    }
  }, [fetchHorses, preselectedHorse]);

  useEffect(() => {
    if (!selectedHorse || !currentUser?.uid) {
      setSessions([]);
      setIsLoadingSessions(false);
      return;
    }

    setIsLoadingSessions(true);
    setSessions([]);

    const fetchHorseSessions = async () => {
      try {
        const fetchedSessions = await getSessionsByHorseId(selectedHorse.id);
        setSessions(fetchedSessions);
      } catch (error) {
        console.error("Error fetching sessions for horse:", selectedHorse.id, error);
        setSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchHorseSessions();
  }, [selectedHorse, currentUser?.uid]);

  useEffect(() => {
    if (sessions.length === 0) {
      return;
    }

    const blockIdsToFetch = sessions
      .map(session => session.blockId)
      .filter(blockId => blockId && blockDetailsCache[blockId] === undefined);

    const uniqueBlockIdsToFetch = Array.from(new Set(blockIdsToFetch));

    if (uniqueBlockIdsToFetch.length > 0) {
      const fetchAllMissingBlockTitles = async () => {
        const promises = uniqueBlockIdsToFetch.map(async (blockId) => {
          if (!blockId) return null;
          try {
            const block = await getBlockById(blockId);
            return { blockId, title: block?.title || 'Etapa Desconocida' };
          } catch (error) {
            console.error(`Error fetching block title for ${blockId}:`, error);
            return { blockId, title: 'Error al cargar etapa' };
          }
        });
        const results = await Promise.all(promises);
        setBlockDetailsCache(prev => {
          const newCache = { ...prev };
          results.forEach(result => {
            if (result) {
              newCache[result.blockId] = result.title;
            }
          });
          return newCache;
        });
      };
      fetchAllMissingBlockTitles();
    }
  }, [sessions, blockDetailsCache]);

  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    if (!preselectedHorse) { // Only refetch all horses if not preselected
      fetchHorses();
    }
  };

  const renderSessionContent = () => {
    if (isLoadingSessions) {
      return (
        <div className="flex justify-center items-center py-8">
          <Icons.spinner className="h-8 w-8 animate-spin" />
          <p className="ml-2">Cargando sesiones...</p>
        </div>
      );
    }

    if (!selectedHorse) {
      if (!preselectedHorse && isLoadingHorses) { // Show horse loading only if not preselected
         return (
            <div className="flex justify-center items-center py-8">
                <Icons.spinner className="h-8 w-8 animate-spin" />
                <p className="ml-2">Cargando caballos...</p>
            </div>
         );
      }
      if (!preselectedHorse && horses.length > 0) { // Show select horse message only if not preselected
        return (
            <Card>
                <CardContent className="py-6 text-center">
                <Icons.logo className="mx-auto h-12 w-12 text-muted-foreground mb-4" data-ai-hint="horse pointing" />
                <p className="text-muted-foreground">Por favor, selecciona un caballo para ver su historial.</p>
                </CardContent>
            </Card>
        );
      }
      // If preselectedHorse was null or no horses exist
      return (
          <Card>
              <CardContent className="py-6 text-center">
              <Icons.logo className="mx-auto h-12 w-12 text-muted-foreground mb-4" data-ai-hint="horse plus" />
              <p className="text-muted-foreground">
                { preselectedHorse === null && horses.length === 0 ? "No se ha seleccionado un caballo o no hay caballos registrados." :
                  !preselectedHorse ? "No tienes caballos registrados. Añade uno para empezar." :
                  "No hay información de caballo disponible."
                }
              </p>
              {!preselectedHorse && (
                <Button className="mt-4" onClick={() => setIsAddHorseDialogOpen(true)}>
                    <Icons.plus className="mr-2 h-4 w-4" /> Añadir Caballo
                </Button>
              )}
              </CardContent>
          </Card>
      );
    }

    if (sessions.length === 0) {
      return (
        <Card>
          <CardContent className="py-6 text-center">
            <Icons.logo className="mx-auto h-12 w-12 text-muted-foreground mb-4" data-ai-hint="horse sad" />
            <p className="text-muted-foreground">No hay sesiones registradas para {selectedHorse.name}.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Sesiones de {selectedHorse.name}</h2>
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle>
                Sesión del {format(session.date.toDate(), "PPP", { locale: es })}
              </CardTitle>
              <CardDescription>
                Etapa: {session.blockId && blockDetailsCache[session.blockId] ? blockDetailsCache[session.blockId] : (session.blockId ? <Icons.spinner className="inline-block h-4 w-4 animate-spin" /> : 'Etapa Desconocida')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.overallNote && (
                <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                  <strong>Nota General:</strong> {session.overallNote}
                </p>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/session/${session.id}?horseId=${selectedHorse?.id}`}>Ver Detalles de la Sesión</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 sm:py-10">
      {!preselectedHorse && ( // Only show selector if no horse is preselected
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Historial de Sesiones</CardTitle>
            <CardDescription>Selecciona un caballo para ver su historial de entrenamiento.</CardDescription>
          </CardHeader>
          <CardContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto justify-between">
                  {selectedHorse ? selectedHorse.name : (isLoadingHorses ? "Cargando caballos..." : "Seleccionar Caballo")}
                  {!isLoadingHorses && <Icons.chevronDown className="ml-2 h-4 w-4" />}
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
      )}

      {renderSessionContent()}

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
