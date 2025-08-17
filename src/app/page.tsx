'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, addDoc } from 'firebase/firestore';
import { TrainingPlan, Exercise } from '@/data/training-plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<'Unbroke' | 'Retraining' | 'Continuing Training'>('Unbroke');
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCategory, setNewPlanCategory] = useState<'Unbroke' | 'Retraining' | 'Continuing Training'>('Unbroke');
  const [newPlanDuration, setNewPlanDuration] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '', description: '', duration: '', reps: '' }]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'trainingPlans'), (snapshot) => {
      const plans: TrainingPlan[] = [];
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const plan: TrainingPlan = {
          id: doc.id,
          category: data.category,
          name: data.name,
          description: data.description,
          duration: data.duration,
          exercises: data.exercises,
        };
        plans.push(plan);
      });
      setTrainingPlans(plans);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching training plans: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch training plans from Firestore.",
      })
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAddExercise = () => {
    setExercises([...exercises, { name: '', description: '', duration: '', reps: '' }]);
  };

  const handleExerciseChange = (index: number, field: keyof Exercise, value: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[index][field] = value;
    setExercises(updatedExercises);
  };
  
  const handleRemoveExercise = (index: number) => {
    const updatedExercises = [...exercises];
    updatedExercises.splice(index, 1);
    setExercises(updatedExercises);
  };

  const resetForm = () => {
    setNewPlanName('');
    setNewPlanCategory('Unbroke');
    setNewPlanDuration('');
    setNewPlanDescription('');
    setExercises([{ name: '', description: '', duration: '', reps: '' }]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName || !newPlanDescription || !newPlanDuration) {
       toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill out all plan details.",
      })
      return;
    }
    
    try {
      await addDoc(collection(db, 'trainingPlans'), {
        name: newPlanName,
        category: newPlanCategory,
        duration: newPlanDuration,
        description: newPlanDescription,
        exercises: exercises.filter(ex => ex.name), // Only add exercises with a name
      });

      toast({
        title: "Success!",
        description: "New training plan has been added.",
      })
      resetForm();
      setIsDialogOpen(false);

    } catch (error) {
       console.error("Error adding document: ", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem adding the training plan.",
      })
    }
  };

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
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Training Plan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Plan Name</Label>
                      <Input id="name" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="e.g., Groundwork Fundamentals" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={newPlanCategory} onValueChange={(value) => setNewPlanCategory(value as any)}>
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
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input id="duration" value={newPlanDuration} onChange={e => setNewPlanDuration(e.target.value)} placeholder="e.g., 4 Weeks" />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={newPlanDescription} onChange={e => setNewPlanDescription(e.target.value)} placeholder="A brief overview of the plan's goals." />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Exercises</h3>
                     <div className="space-y-4">
                      {exercises.map((exercise, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                           {exercises.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => handleRemoveExercise(index)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              <span className="sr-only">Remove Exercise</span>
                            </Button>
                          )}
                          <div className="space-y-2">
                             <Label htmlFor={`ex-name-${index}`}>Exercise Name</Label>
                             <Input id={`ex-name-${index}`} value={exercise.name} onChange={e => handleExerciseChange(index, 'name', e.target.value)} placeholder="e.g., Yielding to Pressure" />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor={`ex-desc-${index}`}>Description</Label>
                             <Textarea id={`ex-desc-${index}`} value={exercise.description} onChange={e => handleExerciseChange(index, 'description', e.target.value)} placeholder="Describe the exercise" />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <Label htmlFor={`ex-duration-${index}`}>Duration</Label>
                               <Input id={`ex-duration-${index}`} value={exercise.duration} onChange={e => handleExerciseChange(index, 'duration', e.target.value)} placeholder="e.g., 15 mins" />
                             </div>
                             <div className="space-y-2">
                               <Label htmlFor={`ex-reps-${index}`}>Reps</Label>
                               <Input id={`ex-reps-${index}`} value={exercise.reps} onChange={e => handleExerciseChange(index, 'reps', e.target.value)} placeholder="e.g., 5-10 times" />
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddExercise} className="mt-4">
                      Add Exercise
                    </Button>
                  </div>
                   <DialogFooter>
                      <Button type="submit">Save Plan</Button>
                   </DialogFooter>
                </form>
              </DialogContent>
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

        {loading ? (
          <p className="text-center">Loading training plans...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPlans.map((plan: TrainingPlan) => (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.duration}</CardDescription>
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
                    <AccordionItem value="json">
                      <AccordionTrigger>View JSON</AccordionTrigger>
                      <AccordionContent>
                        <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                          <code>
                            {JSON.stringify(plan.exercises, null, 2)}
                          </code>
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
