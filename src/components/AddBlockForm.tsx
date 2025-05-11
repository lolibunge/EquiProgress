
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
import { addTrainingBlock, type TrainingBlockInput } from '@/services/firestore';
import { Icons } from '@/components/icons';

const addBlockSchema = z.object({
  title: z.string().min(3, { message: "El título debe tener al menos 3 caracteres." }).max(100, { message: "El título no puede exceder los 100 caracteres." }),
  notes: z.string().max(200, { message: "El subtítulo no puede exceder los 200 caracteres."}).optional(),
  duration: z.string().max(50, { message: "La duración no puede exceder los 50 caracteres."}).optional(),
});

type AddBlockFormValues = z.infer<typeof addBlockSchema>;

interface AddBlockFormProps {
  planId: string;
  onSuccess: (blockId: string) => void;
  onCancel: () => void;
}

export default function AddBlockForm({ planId, onSuccess, onCancel }: AddBlockFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddBlockFormValues>({
    resolver: zodResolver(addBlockSchema),
    defaultValues: {
      title: "",
      notes: "",
      duration: "",
    },
  });

  const onSubmit: SubmitHandler<AddBlockFormValues> = async (data) => {
    setIsLoading(true);
    if (!planId) {
        toast({ variant: "destructive", title: "Error", description: "ID del plan no encontrado."});
        setIsLoading(false);
        return;
    }
    try {
      const blockInputData: TrainingBlockInput = { // Data model still uses TrainingBlockInput
        title: data.title,
        notes: data.notes,
        duration: data.duration,
      };
      const blockId = await addTrainingBlock(planId, blockInputData); // Service function still uses addTrainingBlock
      toast({
        title: "Etapa Añadida",
        description: `La etapa "${data.title}" ha sido guardada exitosamente.`,
      });
      form.reset();
      onSuccess(blockId);
    } catch (error: any) {
      console.error("Error adding training block/etapa:", error);
      toast({
        variant: "destructive",
        title: "Error al Añadir Etapa",
        description: error.message || "Ocurrió un error inesperado al guardar la etapa.",
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
              <FormLabel>Título de la Etapa</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Etapa 1, Fundamentos" {...field} />
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
                <Textarea placeholder="Notas adicionales o un subtítulo para la etapa..." {...field} />
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
                <Input placeholder="Ej: 1 semana, 3 días" {...field} />
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
            Guardar Etapa
          </Button>
        </div>
      </form>
    </Form>
  );
}
