
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { addTrainingPlan, type TrainingPlanInput } from '@/services/firestore';
import { Icons } from '@/components/icons';

const addPlanSchema = z.object({
  title: z.string().min(3, { message: "El título debe tener al menos 3 caracteres." }).max(100, { message: "El título no puede exceder los 100 caracteres." }),
  template: z.boolean().default(false).optional(),
});

type AddPlanFormValues = z.infer<typeof addPlanSchema>;

interface AddPlanFormProps {
  onSuccess: (planId: string) => void;
  onCancel: () => void;
}

export default function AddPlanForm({ onSuccess, onCancel }: AddPlanFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddPlanFormValues>({
    resolver: zodResolver(addPlanSchema),
    defaultValues: {
      title: "",
      template: false,
    },
  });

  const onSubmit: SubmitHandler<AddPlanFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const planInputData: TrainingPlanInput = {
        title: data.title,
        template: data.template,
      };
      const planId = await addTrainingPlan(planInputData);
      toast({
        title: "Plan Añadido",
        description: `El plan "${data.title}" ha sido guardado exitosamente.`,
      });
      form.reset();
      onSuccess(planId);
    } catch (error: any) {
      console.error("Error adding training plan:", error);
      toast({
        variant: "destructive",
        title: "Error al Añadir Plan",
        description: error.message || "Ocurrió un error inesperado al guardar el plan.",
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
              <FormLabel>Título del Plan</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Doma Básica Semana 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="template"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  ¿Es una plantilla?
                </FormLabel>
                 <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Plan
          </Button>
        </div>
      </form>
    </Form>
  );
}
