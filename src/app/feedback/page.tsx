'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db, USE_FIRESTORE } from '@/lib/firebase';
import { getTrialLockStage, getTrialStatus } from '@/lib/pricing';

type Rating = 1 | 2 | 3 | 4 | 5;

export default function FeedbackPage() {
  return (
    <Suspense fallback={<FeedbackPageLoading />}>
      <FeedbackPageContent />
    </Suspense>
  );
}

function FeedbackPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [rating, setRating] = useState<Rating>(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [grantedDays, setGrantedDays] = useState(0);
  const source = searchParams.get('source');
  const returnPath = sanitizeReturnPath(searchParams.get('from'));

  useEffect(() => {
    if (!sent) return;
    if (source !== 'trial-lock' && grantedDays <= 0) return;

    const redirectTo = returnPath ?? '/';
    const timer = window.setTimeout(() => {
      router.push(redirectTo);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [grantedDays, returnPath, router, sent, source]);

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
      let autoGrantedDays = 0;

      if (db && USE_FIRESTORE) {
        const userRef = doc(db, 'users', user.uid);
        const feedbackRef = doc(collection(db, 'users', user.uid, 'feedback'));

        await runTransaction(db, async (transaction) => {
          const userSnapshot = await transaction.get(userRef);
          const userData = (userSnapshot.data() ?? {}) as Record<string, unknown>;

          const createdAt =
            parseDateLike(userData.createdAt) ?? parseDateLike(user.metadata.creationTime);
          const currentExtensionDays = parseNonNegativeInt(userData.trialExtensionDays);
          const currentLastFeedbackAt = parseDateLike(userData.lastFeedbackAt);
          const currentTrialStatus = getTrialStatus(createdAt, {
            extraDays: currentExtensionDays,
          });
          const currentStage = getTrialLockStage(currentTrialStatus, {
            lastFeedbackAt: currentLastFeedbackAt,
          });
          const shouldAutoGrant = currentStage === 'feedback_required';

          if (shouldAutoGrant) {
            autoGrantedDays = 30;
          }

          transaction.set(feedbackRef, {
            rating,
            comment: cleanComment,
            planContext: null,
            source: source ?? null,
            userEmail: user.email ?? null,
            userName: user.displayName ?? null,
            createdAt: serverTimestamp(),
          });

          transaction.set(
            userRef,
            {
              lastFeedbackAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              ...(shouldAutoGrant
                ? {
                    trialExtensionDays: currentExtensionDays + 30,
                    trialExtendedAt: serverTimestamp(),
                  }
                : {}),
            },
            { merge: true }
          );
        });

        markLocalFeedbackSubmitted(user.uid);
        if (autoGrantedDays > 0) {
          addLocalTrialExtensionDays(user.uid, autoGrantedDays);
        }
      } else {
        const shouldAutoGrantLocally = shouldAutoGrantInLocalMode(
          user.uid,
          user.metadata.creationTime
        );

        saveFeedbackLocally({
          rating,
          comment: cleanComment,
          userEmail: user.email ?? null,
          userName: user.displayName ?? null,
          createdAt: new Date().toISOString(),
        });
        markLocalFeedbackSubmitted(user.uid);
        if (shouldAutoGrantLocally) {
          addLocalTrialExtensionDays(user.uid, 30);
          autoGrantedDays = 30;
        }
      }

      setGrantedDays(autoGrantedDays);
      setSent(true);
      setComment('');

      toast({
        title: '¡Gracias por tu opinión!',
        description:
          autoGrantedDays > 0
            ? `Acceso extendido: +${autoGrantedDays} días.`
            : db && USE_FIRESTORE
              ? 'Se guardó correctamente en la nube.'
              : 'Se guardó localmente en este dispositivo.',
      });
    } catch (error) {
      let fallbackGrantedDays = 0;
      const shouldAutoGrantLocally = shouldAutoGrantInLocalMode(
        user.uid,
        user.metadata.creationTime
      );

      saveFeedbackLocally({
        rating,
        comment: cleanComment,
        userEmail: user.email ?? null,
        userName: user.displayName ?? null,
        createdAt: new Date().toISOString(),
      });
      markLocalFeedbackSubmitted(user.uid);
      if (shouldAutoGrantLocally) {
        addLocalTrialExtensionDays(user.uid, 30);
        fallbackGrantedDays = 30;
      }
      setGrantedDays(fallbackGrantedDays);
      setSent(true);
      setComment('');

      toast({
        variant: 'destructive',
        title: 'No se pudo guardar en la nube',
        description:
          fallbackGrantedDays > 0
            ? `Lo guardamos localmente y activamos +${fallbackGrantedDays} días (${feedbackErrorCode(error)}).`
            : `Lo guardamos localmente por ahora (${feedbackErrorCode(error)}).`,
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
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {grantedDays > 0
                      ? `¡Gracias! Tu opinión quedó registrada y se activaron +${grantedDays} días. Redirigiendo...`
                      : source === 'trial-lock'
                        ? '¡Gracias! Tu opinión quedó registrada. Redirigiendo...'
                        : '¡Gracias! Tu opinión quedó registrada.'}
                  </p>
                  {returnPath && (
                    <Button type="button" variant="outline" asChild>
                      <Link href={returnPath}>Volver</Link>
                    </Button>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function FeedbackPageLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Cargando comentarios...</CardTitle>
            <CardDescription>Preparando formulario.</CardDescription>
          </CardHeader>
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

function sanitizeReturnPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  return value;
}

function markLocalFeedbackSubmitted(uid: string) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`equi:lastFeedbackAt:${uid}`, new Date().toISOString());
  } catch {
    // Ignorado: no bloquea la experiencia del usuario.
  }
}

function addLocalTrialExtensionDays(uid: string, days: number) {
  if (typeof window === 'undefined') return;

  const extraDays = Math.max(0, Math.floor(days));
  if (extraDays <= 0) return;

  try {
    const key = `equi:trialExtensionDays:${uid}`;
    const current = Number(localStorage.getItem(key));
    const safeCurrent = Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
    localStorage.setItem(key, String(safeCurrent + extraDays));
  } catch {
    // Ignorado: no bloquea la experiencia del usuario.
  }
}

function shouldAutoGrantInLocalMode(uid: string, createdAt: string | null | undefined): boolean {
  const currentExtensionDays = readLocalTrialExtensionDays(uid);
  const currentLastFeedbackAt = readLocalFeedbackAt(uid);
  const currentTrialStatus = getTrialStatus(createdAt, { extraDays: currentExtensionDays });
  const currentStage = getTrialLockStage(currentTrialStatus, {
    lastFeedbackAt: currentLastFeedbackAt,
  });

  return currentStage === 'feedback_required';
}

function readLocalTrialExtensionDays(uid: string): number {
  if (typeof window === 'undefined') return 0;

  try {
    const raw = localStorage.getItem(`equi:trialExtensionDays:${uid}`);
    return parseNonNegativeInt(raw);
  } catch {
    return 0;
  }
}

function readLocalFeedbackAt(uid: string): Date | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`equi:lastFeedbackAt:${uid}`);
    return parseDateLike(raw);
  } catch {
    return null;
  }
}

function parseNonNegativeInt(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function parseDateLike(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  if (typeof value === 'object' && value) {
    const maybeTimestamp = value as {
      toDate?: () => unknown;
      toMillis?: () => unknown;
    };

    if (typeof maybeTimestamp.toDate === 'function') {
      try {
        const parsed = maybeTimestamp.toDate();
        if (parsed instanceof Date && Number.isFinite(parsed.getTime())) {
          return parsed;
        }
      } catch {
        // Continues with other parsing strategies.
      }
    }

    if (typeof maybeTimestamp.toMillis === 'function') {
      try {
        const millis = Number(maybeTimestamp.toMillis());
        if (Number.isFinite(millis)) {
          const parsed = new Date(millis);
          return Number.isFinite(parsed.getTime()) ? parsed : null;
        }
      } catch {
        // Ignore malformed timestamp-like values.
      }
    }
  }

  return null;
}
