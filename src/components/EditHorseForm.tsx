
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateHorse, type HorseInputData } from '@/services/horse';
import type { Horse } from '@/types/firestore';
import { Icons } from '@/components/icons';

const editHorseSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }).max(50, { message: "El nombre no puede exceder los 50 caracteres." }),
  age: z.coerce.number().int({ message: "La edad debe ser un número entero." }).positive({ message: "La edad debe ser un número positivo." }).max(50, { message: "La edad parece demasiado alta."}),
  sex: z.enum(["Macho", "Hembra", "Castrado"], {
    required_error: "Por favor, selecciona el sexo del caballo.",
  }),
  color: z.string().min(2, { message: "El color debe tener al menos 2 caracteres." }).max(30, { message: "El color no puede exceder los 30 caracteres." }),
});

type EditHorseFormValues = z.infer<typeof editHorseSchema>;

interface EditHorseFormProps {
  horse: Horse;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditHorseForm({ horse, onSuccess, onCancel }: EditHorseFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditHorseFormValues>({
    resolver: zodResolver(editHorseSchema),
    defaultValues: {
      name: horse.name || "",
      age: horse.age || undefined,
      sex: horse.sex || undefined,
      color: horse.color || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: horse.name || "",
      age: horse.age || undefined,
      sex: horse.sex || undefined,
      color: horse.color || "",
    });
  }, [horse, form]);

  const onSubmit: SubmitHandler<EditHorseFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const horseInputData: Partial<HorseInputData> = {
        name: data.name,
        age: data.age,
        sex: data.sex,
        color: data.color,
      };
      await updateHorse(horse.id, horseInputData);
      toast({
        title: "Caballo Actualizado",
        description: `${data.name} ha sido actualizado exitosamente.`,
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error updating horse:", error);
      toast({
        variant: "destructive",
        title: "Error al Actualizar Caballo",
        description: error.message || "Ocurrió un error inesperado al actualizar el caballo.",
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Caballo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Relámpago" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Edad (años)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Ej: 5"
                  {...field}
                  value={field.value === undefined || field.value === null ? '' : String(field.value)}
                  onChange={e => {
                    const rawValue = e.target.value;
                    field.onChange(rawValue === '' ? undefined : Number(rawValue));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sexo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el sexo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Hembra">Hembra</SelectItem>
                  <SelectItem value="Castrado">Castrado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Alazán, Tordo" {...field} />
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
