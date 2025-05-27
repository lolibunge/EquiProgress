
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
import { updateExercise, type ExerciseInput, type Exercise } from '@/services/firestore';
import { Icons } from '@/components/icons';

const editExerciseSchema = z.object({
  title: z.string().min(3, { message: "El título debe tener al menos 3 caracteres." }).max(100, { message: "El título no puede exceder los 100 caracteres." }),
  description: z.string().max(500, { message: "La descripción no puede exceder los 500 caracteres."}).optional(),
  objective: z.string().max(500, { message: "El objetivo no puede exceder los 500 caracteres."}).optional(),
  suggestedReps: z.string().max(100, { message: "Las repeticiones sugeridas no pueden exceder los 100 caracteres."}).optional().nullable(),
});

type EditExerciseFormValues = z.infer<typeof editExerciseSchema>;

interface EditExerciseFormProps {
  exercise: Exercise;
  planId: string;
  blockId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditExerciseForm({ exercise, planId, blockId, onSuccess, onCancel }: EditExerciseFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditExerciseFormValues>({
    resolver: zodResolver(editExerciseSchema),
    defaultValues: {
      title: exercise.title || "",
      description: exercise.description || "",
      objective: exercise.objective || "",
      suggestedReps: exercise.suggestedReps || "",
    },
  });
  
  useEffect(() => {
    form.reset({
      title: exercise.title || "",
      description: exercise.description || "",
      objective: exercise.objective || "",
      suggestedReps: exercise.suggestedReps || "",
    });
  }, [exercise, form]);

  const onSubmit: SubmitHandler<EditExerciseFormValues> = async (data) => {
    setIsLoading(true);
    if (!planId || !blockId || !exercise.id) {
        toast({ variant: "destructive", title: "Error", description: "IDs de plan, bloque o ejercicio no encontrados."});
        setIsLoading(false);
        return;
    }
    try {
      const exerciseInputData: ExerciseInput = {
        title: data.title,
        description: data.description,
        objective: data.objective,
        suggestedReps: data.suggestedReps,
        // order is not updated here, should be handled by drag-and-drop or specific reorder function
      };
      await updateExercise(planId, blockId, exercise.id, exerciseInputData);
      toast({
        title: "Ejercicio Actualizado",
        description: `El ejercicio "${data.title}" ha sido actualizado exitosamente.`,
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error updating exercise:", error);
      toast({
        variant: "destructive",
        title: "Error al Actualizar Ejercicio",
        description: error.message || "Ocurrió un error inesperado al actualizar el ejercicio.",
      });
    } finally {
      setIsLoading(false);
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
              <FormLabel>Título del Ejercicio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Círculos al paso" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles sobre cómo realizar el ejercicio..." {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="objective"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo del Ejercicio (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="¿Qué se busca lograr con este ejercicio?" {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="suggestedReps"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repeticiones Sugeridas (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="Ej: 10 o 'Hasta lograr X'" 
                  {...field} 
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}
