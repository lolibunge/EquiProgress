
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
import { updateMasterExercise, type MasterExerciseInput, type MasterExercise } from '@/services/firestore';
import { Icons } from '@/components/icons';

const editMasterExerciseSchema = z.object({
  title: z.string().min(3, { message: "El título debe tener al menos 3 caracteres." }).max(100, { message: "El título no puede exceder los 100 caracteres." }),
  description: z.string().max(1000, { message: "La descripción no puede exceder los 1000 caracteres."}).optional(),
  objective: z.string().max(1000, { message: "El objetivo no puede exceder los 1000 caracteres."}).optional(),
  suggestedReps: z.string().max(100, { message: "Las repeticiones sugeridas no pueden exceder los 100 caracteres."}).optional().nullable(),
  whenToAdvance: z.string().max(1000, { message: "El campo 'Cuándo Avanzar' no puede exceder los 1000 caracteres."}).optional(),
  whatNotToDo: z.string().max(1000, { message: "El campo 'Qué no hacer' no puede exceder los 1000 caracteres."}).optional(),
});

type EditMasterExerciseFormValues = z.infer<typeof editMasterExerciseSchema>;

interface EditMasterExerciseFormProps {
  exercise: MasterExercise;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditMasterExerciseForm({ exercise, onSuccess, onCancel }: EditMasterExerciseFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditMasterExerciseFormValues>({
    resolver: zodResolver(editMasterExerciseSchema),
    defaultValues: {
      title: exercise.title || "",
      description: exercise.description || "",
      objective: exercise.objective || "",
      suggestedReps: exercise.suggestedReps || "",
      whenToAdvance: exercise.whenToAdvance || "",
      whatNotToDo: exercise.whatNotToDo || "",
    },
  });

  useEffect(() => {
    form.reset({
      title: exercise.title || "",
      description: exercise.description || "",
      objective: exercise.objective || "",
      suggestedReps: exercise.suggestedReps || "",
      whenToAdvance: exercise.whenToAdvance || "",
      whatNotToDo: exercise.whatNotToDo || "",
    });
  }, [exercise, form]);

  const onSubmit: SubmitHandler<EditMasterExerciseFormValues> = async (data) => {
    setIsLoading(true);
    if (!exercise.id) {
        toast({ variant: "destructive", title: "Error", description: "ID del ejercicio maestro no encontrado."});
        setIsLoading(false);
        return;
    }
    try {
      const exerciseInputData: Partial<MasterExerciseInput> = { // Partial because not all fields are always updated
        title: data.title,
        description: data.description,
        objective: data.objective,
        suggestedReps: data.suggestedReps || null,
        whenToAdvance: data.whenToAdvance,
        whatNotToDo: data.whatNotToDo,
      };
      await updateMasterExercise(exercise.id, exerciseInputData);
      toast({
        title: "Ejercicio Maestro Actualizado",
        description: `El ejercicio "${data.title}" ha sido actualizado exitosamente.`,
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error updating master exercise:", error);
      toast({
        variant: "destructive",
        title: "Error al Actualizar Ejercicio Maestro",
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
              <FormLabel>Repeticiones/Duración Sugeridas (Opcional)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Ej: 10 reps, 5 min, o 'Hasta calmarse'"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="whenToAdvance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuándo Avanzar (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Criterios o señales para pasar al siguiente nivel o ejercicio..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="whatNotToDo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qué NO Hacer (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Errores comunes a evitar o acciones contraproducentes..." {...field} value={field.value ?? ''} />
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
