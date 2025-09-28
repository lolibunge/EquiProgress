// app/plans/[id]/not-found.tsx
export default function NotFound() {
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-2">Plan no encontrado</h1>
      <p className="text-muted-foreground">Revisa el enlace o vuelve al inicio.</p>
    </div>
  );
}
