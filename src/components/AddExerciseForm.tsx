
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { addExerciseToBlock, type ExerciseInput } from '@/services/firestore';
import { Icons } from '@/components/icons';

const addExerciseSchema = z.object({
  title: z.string().min(3, { message: "El título debe tener al menos 3 caracteres." }).max(100, { message: "El título no puede exceder los 100 caracteres." }),
  description: z.string().max(500, { message: "La descripción no puede exceder los 500 caracteres."}).optional(),
  objective: z.string().max(500, { message: "El objetivo no puede exceder los 500 caracteres."}).optional(),
  suggestedReps: z.coerce.number().int({ message: "Las repeticiones deben ser un número entero." }).positive({message: "Las repeticiones deben ser un número positivo."}).optional(),
});

type AddExerciseFormValues = z.infer<typeof addExerciseSchema>;

interface AddExerciseFormProps {
  planId: string;
  blockId: string;
  onSuccess: (exerciseId: string) => void;
  onCancel: () => void;
}

export default function AddExerciseForm({ planId, blockId, onSuccess, onCancel }: AddExerciseFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddExerciseFormValues>({
    resolver: zodResolver(addExerciseSchema),
    defaultValues: {
      title: "",
      description: "",
      objective: "",
      suggestedReps: undefined,
    },
  });

  const onSubmit: SubmitHandler<AddExerciseFormValues> = async (data) => {
    setIsLoading(true);
    if (!planId || !blockId) {
        toast({ variant: "destructive", title: "Error", description: "IDs de plan o bloque no encontrados."});
        setIsLoading(false);
        return;
    }
    try {
      const exerciseInputData: ExerciseInput = {
        title: data.title,
        description: data.description,
        objective: data.objective,
        suggestedReps: data.suggestedReps,
      };
      const exerciseId = await addExerciseToBlock(planId, blockId, exerciseInputData);
      toast({
        title: "Ejercicio Añadido",
        description: `El ejercicio "${data.title}" ha sido guardado exitosamente.`,
      });
      form.reset();
      onSuccess(exerciseId);
    } catch (error: any) {
      console.error("Error adding exercise:", error);
      toast({
        variant: "destructive",
        title: "Error al Añadir Ejercicio",
        description: error.message || "Ocurrió un error inesperado al guardar el ejercicio.",
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
                <Textarea placeholder="Detalles sobre cómo realizar el ejercicio..." {...field} />
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
                <Textarea placeholder="¿Qué se busca lograr con este ejercicio?" {...field} />
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
                  type="number" 
                  placeholder="Ej: 10" 
                  {...field} 
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
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
            Guardar Ejercicio
          </Button>
        </div>
      </form>
    </Form>
  );
}
