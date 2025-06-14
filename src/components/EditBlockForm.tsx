
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { updateTrainingBlock, deleteTrainingBlock, type TrainingBlockInput, type TrainingBlock } from '@/services/firestore';
import { Icons } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const editBlockSchema = z.object({
  title: z.string().min(3, { message: "El título debe tener al menos 3 caracteres." }).max(100, { message: "El título no puede exceder los 100 caracteres." }),
  notes: z.string().max(200, { message: "El subtítulo no puede exceder los 200 caracteres."}).optional(),
  duration: z.string().max(50, { message: "La duración no puede exceder los 50 caracteres."}).optional(),
  goal: z.string().max(500, { message: "La meta no puede exceder los 500 caracteres."}).optional(),
});

type EditBlockFormValues = z.infer<typeof editBlockSchema>;

interface EditBlockFormProps {
  block: TrainingBlock; // Represents a "Week"
  planId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditBlockForm({ block, planId, onSuccess, onCancel }: EditBlockFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<EditBlockFormValues>({
    resolver: zodResolver(editBlockSchema),
    defaultValues: {
      title: block.title || "",
      notes: block.notes || "",
      duration: block.duration || "",
      goal: block.goal || "",
    },
  });

  useEffect(() => {
    form.reset({
      title: block.title || "",
      notes: block.notes || "",
      duration: block.duration || "",
      goal: block.goal || "",
    });
  }, [block, form]);

  const onSubmit: SubmitHandler<EditBlockFormValues> = async (data) => {
    setIsLoading(true);
    if (!planId || !block.id) {
        toast({ variant: "destructive", title: "Error", description: "ID del plan o de la semana no encontrado."});
        setIsLoading(false);
        return;
    }
    try {
      const blockInputData: Partial<Omit<TrainingBlockInput, 'planId' | 'order' | 'exerciseReferences'>> = { 
        title: data.title,
        notes: data.notes || null, // Store empty string as null
        duration: data.duration || null,
        goal: data.goal || null,
      };
      await updateTrainingBlock(planId, block.id, blockInputData); 
      toast({
        title: "Semana Actualizada",
        description: `La semana "${data.title}" ha sido actualizada exitosamente.`,
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error updating training block/week:", error);
      toast({
        variant: "destructive",
        title: "Error al Actualizar Semana",
        description: error.message || "Ocurrió un error inesperado al actualizar la semana.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBlock = async () => {
    setIsDeleting(true);
    if (!planId || !block.id) {
      toast({ variant: "destructive", title: "Error", description: "ID del plan o de la semana no encontrado." });
      setIsDeleting(false);
      return;
    }
    try {
      await deleteTrainingBlock(planId, block.id);
      toast({
        title: "Semana Eliminada",
        description: `La semana "${block.title}" y todos sus días han sido eliminados.`,
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error deleting training block/week:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar Semana",
        description: error.message || "Ocurrió un error inesperado al eliminar la semana.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de la Semana</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Semana 1, Fundamentos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subtítulo (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Notas adicionales o un subtítulo para la semana..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duración (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: 7 días" {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meta de la Semana (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe la meta principal de esta semana..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between items-center pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={isLoading || isDeleting}>
                {isDeleting ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.trash className="mr-2 h-4 w-4" />}
                Eliminar Semana
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente la semana
                  &quot;{block.title}&quot; y todos los días que contiene.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBlock} disabled={isDeleting}>
                  {isDeleting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isDeleting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || isDeleting}>
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
