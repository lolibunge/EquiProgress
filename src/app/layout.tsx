
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToasterProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'EquiProgress', 
  description: 'Realiza seguimiento de tus sesiones de entrenamiento y progreso equino.', 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ToasterProvider> {/* Add this opening tag */}
          <AuthProvider>
            <Navbar />
            <main>{children}</main>
            <Toaster />
          </AuthProvider>
        </ToasterProvider> {/* Add this closing tag */}
      </body>

    </html>
  );
}
