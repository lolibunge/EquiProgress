
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getHorses as fetchHorsesService, deleteHorse as deleteHorseService } from "@/services/horse";
import type { Horse } from "@/types/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddHorseForm from "@/components/AddHorseForm";
import EditHorseForm from "@/components/EditHorseForm";

export default function HorsesPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [horses, setHorses] = useState<Horse[]>([]);
  const [isLoadingHorses, setIsLoadingHorses] = useState(true);

  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);
  const [isEditHorseDialogOpen, setIsEditHorseDialogOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState<Horse | null>(null);

  const [isDeleteHorseDialogOpen, setIsDeleteHorseDialogOpen] = useState(false);
  const [deletingHorse, setDeletingHorse] = useState<Horse | null>(null);
  const [isProcessingHorseDelete, setIsProcessingHorseDelete] = useState(false);

  const performFetchHorses = useCallback(async (uid: string) => {
    setIsLoadingHorses(true);
    try {
      const userHorses = await fetchHorsesService(uid);
      setHorses(userHorses);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Cargar Caballos", description: "No se pudieron cargar los caballos." });
      setHorses([]);
    } finally {
      setIsLoadingHorses(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser?.uid && !authLoading) {
      performFetchHorses(currentUser.uid);
    } else if (!currentUser && !authLoading) {
      setIsLoadingHorses(false);
      setHorses([]);
    }
  }, [currentUser, authLoading, performFetchHorses]);

  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) performFetchHorses(currentUser.uid);
  };
  const handleAddHorseCancel = () => setIsAddHorseDialogOpen(false);

  const handleHorseUpdated = () => {
    setIsEditHorseDialogOpen(false);
    setEditingHorse(null);
    if (currentUser?.uid) performFetchHorses(currentUser.uid);
  };

  const openEditHorseDialog = (horse: Horse) => {
    setEditingHorse(horse);
    setIsEditHorseDialogOpen(true);
  };

  const openDeleteHorseDialog = (horse: Horse) => {
    setDeletingHorse(horse);
    setIsDeleteHorseDialogOpen(true);
  };

  const handleDeleteHorseConfirmed = async () => {
    if (!deletingHorse) return;
    setIsProcessingHorseDelete(true);
    try {
      await deleteHorseService(deletingHorse.id);
      toast({ title: "Caballo Eliminado", description: `El caballo "${deletingHorse.name}" ha sido eliminado.` });
      setDeletingHorse(null);
      setIsDeleteHorseDialogOpen(false);
      if (currentUser?.uid) {
        performFetchHorses(currentUser.uid);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Eliminar Caballo", description: "No se pudo eliminar el caballo." });
    } finally {
      setIsProcessingHorseDelete(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Icons.spinner className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center py-10 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              Debes iniciar sesión para gestionar tus caballos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-2xl md:text-3xl">Mis Caballos</CardTitle>
              <CardDescription>Gestiona los detalles de tus caballos, añade nuevos o elimínalos.</CardDescription>
            </div>
            <Button onClick={() => setIsAddHorseDialogOpen(true)} className="w-full mt-2 sm:mt-0 sm:w-auto">
              <Icons.plus className="mr-2 h-4 w-4" /> Añadir Nuevo Caballo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHorses ? (
            <div className="flex justify-center py-10">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : horses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
              <Icons.horse className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty stable horse" />
              <h3 className="text-xl font-semibold">No Tienes Caballos Registrados</h3>
              <p className="text-muted-foreground">
                Comienza añadiendo tu primer caballo para realizar el seguimiento de su progreso.
              </p>
              <Button className="mt-6" onClick={() => setIsAddHorseDialogOpen(true)}>
                <Icons.plus className="mr-2 h-4 w-4" /> Añadir Primer Caballo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {horses.map((horse) => (
                <Card key={horse.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{horse.name}</CardTitle>
                    <CardDescription>{horse.age} años, {horse.sex}, {horse.color}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {/* Future: Add more details like active plan or last session */}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => openEditHorseDialog(horse)}>
                      <Icons.edit className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteHorseDialog(horse)}>
                      <Icons.trash className="mr-1 h-3.5 w-3.5" /> Eliminar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddHorseDialogOpen} onOpenChange={setIsAddHorseDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Caballo</DialogTitle>
            <DialogDescription>Completa los detalles para registrar un nuevo caballo.</DialogDescription>
          </DialogHeader>
          <AddHorseForm onSuccess={handleHorseAdded} onCancel={handleAddHorseCancel} />
        </DialogContent>
      </Dialog>

      {editingHorse && (
        <Dialog open={isEditHorseDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingHorse(null);
          setIsEditHorseDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Editar Caballo: {editingHorse.name}</DialogTitle>
              <DialogDescription>Modifica los detalles de tu caballo.</DialogDescription>
            </DialogHeader>
            <EditHorseForm horse={editingHorse} onSuccess={handleHorseUpdated} onCancel={() => { setIsEditHorseDialogOpen(false); setEditingHorse(null); }} />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isDeleteHorseDialogOpen} onOpenChange={setIsDeleteHorseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al caballo &quot;{deletingHorse?.name}&quot; y todas sus sesiones y progreso asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingHorseDelete} onClick={() => { setIsDeleteHorseDialogOpen(false); setDeletingHorse(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHorseConfirmed} disabled={isProcessingHorseDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isProcessingHorseDelete ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sí, eliminar caballo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

