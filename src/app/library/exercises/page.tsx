
// src/app/library/exercises/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getMasterExercises, deleteMasterExercise, type MasterExercise } from "@/services/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
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
import AddMasterExerciseForm from "@/components/AddMasterExerciseForm";
import EditMasterExerciseForm from "@/components/EditMasterExerciseForm";

export default function ExerciseLibraryPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [exercises, setExercises] = useState<MasterExercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [isEditExerciseDialogOpen, setIsEditExerciseDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<MasterExercise | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const fetchExercises = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingExercises(true);
    try {
      const fetchedExercises = await getMasterExercises();
      setExercises(fetchedExercises);
    } catch (error) {
      console.error("Error fetching master exercises:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ejercicios de la biblioteca." });
    } finally {
      setIsLoadingExercises(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser) {
      fetchExercises();
    }
  }, [currentUser, fetchExercises]);

  const handleAddSuccess = () => {
    setIsAddExerciseDialogOpen(false);
    fetchExercises();
  };

  const handleEditSuccess = () => {
    setIsEditExerciseDialogOpen(false);
    setEditingExercise(null);
    fetchExercises();
  };

  const openEditDialog = (exercise: MasterExercise) => {
    setEditingExercise(exercise);
    setIsEditExerciseDialogOpen(true);
  };

  const openDeleteConfirmation = (exerciseId: string) => {
    setDeletingExerciseId(exerciseId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExerciseId) return;
    setIsProcessingDelete(true);
    try {
      await deleteMasterExercise(deletingExerciseId);
      toast({ title: "Ejercicio Eliminado", description: "El ejercicio ha sido eliminado de la biblioteca." });
      fetchExercises();
      setIsDeleteDialogOpen(false);
      setDeletingExerciseId(null);
    } catch (error) {
      console.error("Error deleting master exercise:", error);
      toast({ variant: "destructive", title: "Error al Eliminar", description: "No se pudo eliminar el ejercicio." });
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const filteredExercises = useMemo(() => {
    if (!searchTerm) return exercises;
    return exercises.filter(exercise =>
      exercise.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [exercises, searchTerm]);

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
              Debes iniciar sesión para acceder a la biblioteca de ejercicios.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex-grow">
              <CardTitle className="text-2xl md:text-3xl">Biblioteca de Ejercicios</CardTitle>
              <CardDescription>
                Aquí puedes ver, crear, editar y eliminar los ejercicios maestros de tu biblioteca.
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddExerciseDialogOpen(true)} className="w-full sm:w-auto">
              <Icons.plus className="mr-2 h-4 w-4" />
              Añadir Nuevo Ejercicio
            </Button>
          </div>
          <div className="mt-4">
            <Input
              type="search"
              placeholder="Buscar ejercicios por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingExercises ? (
            <div className="flex justify-center py-10">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
              <Icons.logo className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty box books" />
              <h3 className="text-xl font-semibold">Tu Biblioteca está Vacía</h3>
              <p className="text-muted-foreground">
                Comienza añadiendo tu primer ejercicio maestro.
              </p>
              <Button className="mt-6" onClick={() => setIsAddExerciseDialogOpen(true)}>
                <Icons.plus className="mr-2 h-4 w-4" />
                 Crear Primer Ejercicio
              </Button>
            </div>
          ) : filteredExercises.length === 0 && searchTerm ? (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                <Icons.search className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="magnifying glass empty" />
                <h3 className="text-xl font-semibold">No se Encontraron Ejercicios</h3>
                <p className="text-muted-foreground">
                  No hay ejercicios que coincidan con &quot;{searchTerm}&quot;. Intenta con otra búsqueda o <button onClick={() => setSearchTerm("")} className="text-primary hover:underline">limpia la búsqueda</button>.
                </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredExercises.map((exercise) => (
                <Card key={exercise.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{exercise.title}</CardTitle>
                    {exercise.suggestedReps && (
                      <CardDescription>Reps/Duración: {exercise.suggestedReps}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2">
                    {exercise.description && (
                        <div className="text-sm">
                            <p className="font-medium">Descripción:</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{exercise.description}</p>
                        </div>
                    )}
                    {exercise.objective && (
                        <div className="text-sm">
                            <p className="font-medium">Objetivo:</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{exercise.objective}</p>
                        </div>
                    )}
                    {exercise.whenToAdvance && (
                        <div className="text-sm">
                            <p className="font-medium">Cuándo Avanzar:</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{exercise.whenToAdvance}</p>
                        </div>
                    )}
                    {exercise.whatNotToDo && (
                        <div className="text-sm">
                            <p className="font-medium">Qué NO Hacer:</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{exercise.whatNotToDo}</p>
                        </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(exercise)}>
                      <Icons.edit className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteConfirmation(exercise.id)}>
                      <Icons.trash className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Añadir Ejercicio */}
      <Dialog open={isAddExerciseDialogOpen} onOpenChange={setIsAddExerciseDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Ejercicio Maestro</DialogTitle>
            <DialogDescription>
              Define un nuevo ejercicio para tu biblioteca.
            </DialogDescription>
          </DialogHeader>
          <AddMasterExerciseForm
            onSuccess={handleAddSuccess}
            onCancel={() => setIsAddExerciseDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Ejercicio */}
      {editingExercise && (
        <Dialog open={isEditExerciseDialogOpen} onOpenChange={(open) => {
            if (!open) setEditingExercise(null);
            setIsEditExerciseDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Ejercicio Maestro</DialogTitle>
              <DialogDescription>
                Modifica los detalles de &quot;{editingExercise.title}&quot;.
              </DialogDescription>
            </DialogHeader>
            <EditMasterExerciseForm
              exercise={editingExercise}
              onSuccess={handleEditSuccess}
              onCancel={() => {
                setIsEditExerciseDialogOpen(false);
                setEditingExercise(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* AlertDialog para Eliminar Ejercicio */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el ejercicio maestro de la biblioteca.
              Si este ejercicio está siendo usado en algún plan, la referencia quedará rota (el ejercicio no aparecerá en la etapa).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isProcessingDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isProcessingDelete ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sí, eliminar ejercicio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

