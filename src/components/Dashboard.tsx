
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState, useCallback } from "react";

import { createSession } from "@/services/session";
const Dashboard = () => {
  const [date, setDate] = useState<Date>();

  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Session Logging Card */}
        <Card>
          <CardHeader>
            <CardTitle>Registrar Nueva Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Comienza a seguir el progreso de tu caballo.
            </p>
            <Button
              className="mt-4"
              disabled={!date}
              onClick={async () => {
                console.log("Create Session clicked");
                console.log("Date:", date);
                if (date) {
                  const sessionData = {
                    date: date.toISOString().split("T")[0],
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Format time
                    horse: "Caballo por Defecto", // Placeholder
                    duration: 60, // Placeholder
                    notes: "", // Placeholder
                  };
                  console.log("Calling createSession");
                  const result = await createSession(sessionData);
                  console.log("SessionId or error:", result);
                  if (result) {
                    window.location.href = `/session/${result}`;
                  } else {
                    alert(
                      "Error al crear la sesión. Por favor, revisa la consola para más detalles."
                    );
                  }
                }
              }}              
            >
              Crear Sesión</Button>
          </CardContent>
        </Card>

        {/* Progress Tracking Card */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ve los datos de entrenamiento y gráficos de progreso de tu caballo.
            </p>
            <Button variant="secondary" className="mt-4">
              Ver Progreso
            </Button>
          </CardContent>
        </Card>

        {/* AI Session Analysis Card */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Sesión con IA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analiza las notas de la sesión e identifica patrones.
            </p>
            <Button variant="secondary" className="mt-4">
              Analizar Sesiones
            </Button>
          </CardContent>
        </Card>
          {/* Calendar Card */}
        <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Calendario de Entrenamiento</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
              {date ? (
                <p className="text-center text-sm font-medium">
                  {date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Selecciona una fecha.
                </p>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default Dashboard;
