'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db, USE_FIRESTORE } from '@/lib/firebase';

type Rating = 1 | 2 | 3 | 4 | 5;

export default function FeedbackPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [rating, setRating] = useState<Rating>(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanComment = comment.trim();

    if (cleanComment.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Comentario muy corto',
        description: 'Cuéntanos un poco más para poder mejorar la app.',
      });
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Necesitas iniciar sesión',
        description: 'Inicia sesión para enviar tu opinión.',
      });
      return;
    }

    setSaving(true);

    try {
      if (db && USE_FIRESTORE) {
        await addDoc(collection(db, 'users', user.uid, 'feedback'), {
          rating,
          comment: cleanComment,
          planContext: null,
          userEmail: user.email ?? null,
          userName: user.displayName ?? null,
          createdAt: serverTimestamp(),
        });
      } else {
        saveFeedbackLocally({
          rating,
          comment: cleanComment,
          userEmail: user.email ?? null,
          userName: user.displayName ?? null,
          createdAt: new Date().toISOString(),
        });
      }

      setSent(true);
      setComment('');

      toast({
        title: '¡Gracias por tu opinión!',
        description: db && USE_FIRESTORE
          ? 'Se guardó correctamente en la nube.'
          : 'Se guardó localmente en este dispositivo.',
      });
    } catch (error) {
      saveFeedbackLocally({
        rating,
        comment: cleanComment,
        userEmail: user.email ?? null,
        userName: user.displayName ?? null,
        createdAt: new Date().toISOString(),
      });

      toast({
        variant: 'destructive',
        title: 'No se pudo guardar en la nube',
        description: `Lo guardamos localmente por ahora (${feedbackErrorCode(error)}).`,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Cargando comentarios...</CardTitle>
              <CardDescription>Verificando tu sesión.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Inicio de sesión requerido</CardTitle>
              <CardDescription>
                Inicia sesión para enviar tu opinión sobre la app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/login">Ir a iniciar sesión</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Volver al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            &larr; Volver
          </Link>
          <h1 className="text-lg font-headline font-semibold">Opinión del estudiante</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>¿Cómo te fue con la app?</CardTitle>
            <CardDescription>
              Tu opinión nos ayuda a mejorar EquiProgress para las próximas clases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Valoración general</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const numeric = value as Rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(numeric)}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          rating === numeric
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-primary/20'
                        }`}
                        aria-pressed={rating === numeric}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  1 = Muy difícil, 5 = Excelente experiencia.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-comment">Comentario</Label>
                <Textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Cuéntanos qué te gustó, qué fue difícil y qué mejorarías."
                  rows={6}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Enviando...' : 'Enviar opinión'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/">Volver al inicio</Link>
                </Button>
              </div>

              {sent && (
                <p className="text-sm text-muted-foreground">
                  ¡Gracias! Tu opinión quedó registrada.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function saveFeedbackLocally(entry: {
  rating: number;
  comment: string;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
}) {
  try {
    const key = 'equi:feedback:local';
    const raw = localStorage.getItem(key);
    const previous = raw ? (JSON.parse(raw) as unknown[]) : [];
    localStorage.setItem(key, JSON.stringify([entry, ...previous].slice(0, 100)));
  } catch {
    // Ignorado: no bloquea la experiencia del usuario.
  }
}

function feedbackErrorCode(error: unknown): string {
  if (typeof error !== 'object' || !error || !('code' in error)) return 'desconocido';
  return String(error.code);
}
