'use client';

import { TrainingPlan, Exercise } from '@/data/training-plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast"
import { db, USE_FIRESTORE } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function Home() {
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'Unbroke' | 'Retraining' | 'Continuing Training'>('Unbroke');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!USE_FIRESTORE || !db) return;
    const unsub = onSnapshot(collection(db, "trainingPlans"), (snapshot) => {
      const plans: TrainingPlan[] = [];
      snapshot.forEach((doc) => {
        plans.push({ id: doc.id, ...doc.data() } as TrainingPlan);
      });
      setTrainingPlans(plans);
    });
    return () => unsub();
  }, []);

  const filteredPlans = trainingPlans.filter(plan => plan.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col antialiased">
      <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Logo className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-headline font-bold text-foreground tracking-tight">EquiProgress</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>New Plan</Button>
              </DialogTrigger>
              <PlanForm onClose={() => setIsDialogOpen(false)} />
            </Dialog>
          </div>
        </div>
      </header>
      
      <main className="flex-grow w-full container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-foreground">
              Equestrian Training Plans
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              From starting a young horse to refining advanced movements, find a plan that fits your journey.
            </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="p-1 rounded-lg bg-muted flex gap-1">
            {(['Unbroke', 'Retraining', 'Continuing Training'] as const).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'ghost'}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/50'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlans.map((plan: TrainingPlan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.duration}</CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground mb-4">{plan.description}</p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="exercises">
                    <AccordionTrigger>View Exercises</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-4 pt-2">
                        {plan.exercises.map((exercise: Exercise, index: number) => (
                          <li key={index} className="border-l-2 border-primary pl-4">
                            <h4 className="font-semibold">{exercise.name}</h4>
                            <p className="text-sm text-muted-foreground">{exercise.description}</p>
                            {exercise.duration && <p className="text-xs text-muted-foreground/80">Duration: {exercise.duration}</p>}
                            {exercise.reps && <p className="text-xs text-muted-foreground/80">Reps: {exercise.reps}</p>}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}


function PlanForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Unbroke' | 'Retraining' | 'Continuing Training'>('Unbroke');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '', description: '', duration: '', reps: '' }]);
  const { toast } = useToast();

  const handleExerciseChange = (index: number, field: keyof Exercise, value: string) => {
    const newExercises = [...exercises];
    newExercises[index][field] = value;
    setExercises(newExercises);
  };

  const addExercise = () => {
    setExercises([...exercises, { name: '', description: '', duration: '', reps: '' }]);
  };

  const removeExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index);
    setExercises(newExercises);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!USE_FIRESTORE || !db) {
        toast({
            title: "Error",
            description: "Firestore is not configured. Please check your Firebase setup.",
            variant: "destructive",
        });
        return;
    }

    const planData = { name, category, duration, description, exercises };
    
    try {
        await addDoc(collection(db, 'trainingPlans'), planData);
        toast({
            title: "Success!",
            description: "New training plan added.",
        });
        onClose();
    } catch (error) {
        console.error("Error saving training plan: ", error);
        toast({
            title: "Error",
            description: "There was a problem saving the training plan.",
            variant: "destructive",
        });
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Training Plan</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="name">Plan Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Groundwork Fundamentals" required />
        </div>
         <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(value: 'Unbroke' | 'Retraining' | 'Continuing Training') => setCategory(value)}>
                <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Unbroke">Unbroke</SelectItem>
                    <SelectItem value="Retraining">Retraining</SelectItem>
                    <SelectItem value="Continuing Training">Continuing Training</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g., 4 Weeks" required />
        </div>
        <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe the plan's goals" required />
        </div>

        <div>
            <h3 className="text-lg font-medium mb-2">Exercises</h3>
            <div className="space-y-4">
                {exercises.map((exercise, index) => (
                    <div key={index} className="p-4 border rounded-md space-y-2 relative">
                         {exercises.length > 1 && (
                            <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeExercise(index)}>
                                Remove
                            </Button>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor={`ex-name-${index}`}>Exercise Name</Label>
                            <Input id={`ex-name-${index}`} value={exercise.name} onChange={e => handleExerciseChange(index, 'name', e.target.value)} placeholder="e.g., Lunging for Respect" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`ex-desc-${index}`}>Description</Label>
                             <Textarea id={`ex-desc-${index}`} value={exercise.description} onChange={e => handleExerciseChange(index, 'description', e.target.value)} placeholder="Describe the exercise" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`ex-duration-${index}`}>Duration (Optional)</Label>
                                <Input id={`ex-duration-${index}`} value={exercise.duration} onChange={e => handleExerciseChange(index, 'duration', e.target.value)} placeholder="e.g., 15 mins" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`ex-reps-${index}`}>Reps (Optional)</Label>
                                <Input id={`ex-reps-${index}`} value={exercise.reps} onChange={e => handleExerciseChange(index, 'reps', e.target.value)} placeholder="e.g., 5 times each side" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addExercise} className="mt-4">
                Add Another Exercise
            </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Plan</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
