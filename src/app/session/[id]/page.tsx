
// src/app/session/[id]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
// import { useEffect, useState } from 'react';
// import type { SessionData } from '@/types/firestore'; // Assuming these types
// import { Timestamp } from 'firebase/firestore'; // For mock data
// import { Icons } from '@/components/icons'; // If using loading icons

const SessionInputPage = () => {
  const params = useParams();
  const id = params.id as string; // Session ID

  // const [sessionData, setSessionData] = useState<SessionData | null>(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   if (id) {
  //     // Here you would fetch the session details.
  //     // For now, we are just displaying a placeholder page.
  //     // Example:
  //     // const fetchDetails = async () => {
  //     //   setLoading(true);
  //     //   // const details = await getSessionService(horseId, id); // Replace with actual service call
  //     //   // setSessionData(details);
  //     //   setLoading(false);
  //     // };
  //     // fetchDetails();
  //     setLoading(false); // Simulate loading finished if not fetching
  //   }
  // }, [id]);

  // if (loading) {
  //   return (
  //     <div className="container mx-auto p-4 flex justify-center items-center h-screen">
  //       <Icons.spinner className="h-10 w-10 animate-spin" />
  //     </div>
  //   );
  // }

  if (!id) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>ID de sesión no encontrado.</p>
            <Button asChild className="mt-4 w-full">
              <Link href="/">Volver al Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-10">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Detalle de la Sesión</CardTitle>
          <CardDescription>
            Estás viendo los detalles para la sesión con ID: <span className="font-mono bg-muted px-1 py-0.5 rounded">{id}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-accent/10 p-4 rounded-md border border-accent/30">
            <p className="text-accent-foreground">
              <span className="font-semibold">Nota:</span> Esta página está actualmente en desarrollo.
            </p>
            <p className="text-accent-foreground mt-1">
              Próximamente podrás registrar aquí los detalles específicos de tu sesión de entrenamiento, como las repeticiones realizadas, la calificación del ejercicio y tus observaciones.
            </p>
          </div>
          
          {/* 
            Placeholder for future content:
            - Display Horse Name, Date, Selected Block/Exercise from initial save.
            - Form to input/update repsDone, rating, comments for the current exercise.
            - Option to add more exercises to this session.
            - Option to mark session as complete.
           */}
          
          <div className="mt-8 flex justify-end">
            <Button asChild variant="outline">
              <Link href="/">Volver al Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionInputPage;
