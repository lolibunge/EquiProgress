
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getAllUserProfiles } from "@/services/auth";
import { getTrainingPlans, updatePlanAllowedUsers, getTrainingBlocks, getExercisesForBlock, type TrainingBlock, type BlockExerciseDisplay } from "@/services/firestore";
import type { UserProfile, TrainingPlan } from "@/types/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface UserPlanPermissions {
  [planId: string]: boolean;
}

interface PlanDetails {
  blocks: TrainingBlock[];
  exercisesByBlock: Map<string, BlockExerciseDisplay[]>;
}

export default function AdminUsersPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const [allPlans, setAllPlans] = useState<TrainingPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [planDetailsCache, setPlanDetailsCache] = useState<Map<string, PlanDetails>>(new Map());
  const [isLoadingPlanDetails, setIsLoadingPlanDetails] = useState<Set<string>>(new Set());


  const [userPlanPermissions, setUserPlanPermissions] = useState<UserPlanPermissions>({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Fetch all users (for admin)
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      setIsLoadingUsers(true);
      getAllUserProfiles()
        .then(setAllUsers)
        .catch(err => {
          console.error("Error fetching all users:", err);
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los usuarios." });
        })
        .finally(() => setIsLoadingUsers(false));
    }
  }, [userProfile, toast]);

  // Fetch all plans (admin context)
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      setIsLoadingPlans(true);
      getTrainingPlans({ uid: currentUser?.uid || null, role: 'admin' })
        .then(async (plans) => {
          setAllPlans(plans);
          // Optional: pre-fetch details for all plans
          // plans.forEach(plan => fetchPlanDetails(plan.id)); 
        })
        .catch(err => {
          console.error("Error fetching all plans:", err);
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los planes." });
        })
        .finally(() => setIsLoadingPlans(false));
    }
  }, [userProfile, currentUser, toast]);


  const fetchPlanDetails = useCallback(async (planId: string) => {
    if (planDetailsCache.has(planId) || isLoadingPlanDetails.has(planId)) return;

    setIsLoadingPlanDetails(prev => new Set(prev).add(planId));
    try {
      const blocks = (await getTrainingBlocks(planId)).sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity));
      const exercisesByBlock = new Map<string, BlockExerciseDisplay[]>();
      for (const block of blocks) {
        const exercises = (await getExercisesForBlock(block.id)).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity));
        exercisesByBlock.set(block.id, exercises);
      }
      setPlanDetailsCache(prev => new Map(prev).set(planId, { blocks, exercisesByBlock }));
    } catch (error) {
      console.error(`Error fetching details for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error de Detalles", description: `No se pudieron cargar detalles para el plan ${planId}.` });
    } finally {
      setIsLoadingPlanDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(planId);
        return newSet;
      });
    }
  }, [planDetailsCache, isLoadingPlanDetails, toast]);


  // Effect to update UI when selectedUser or allPlans change
  useEffect(() => {
    if (selectedUser && allPlans.length > 0) {
      const initialPermissions: UserPlanPermissions = {};
      allPlans.forEach(plan => {
        const isPublicPlan = plan.allowedUserIds === null || plan.allowedUserIds === undefined;
        const isExplicitlyAllowed = Array.isArray(plan.allowedUserIds) && plan.allowedUserIds.includes(selectedUser.uid);
        
        initialPermissions[plan.id] = isPublicPlan || isExplicitlyAllowed;
      });
      setUserPlanPermissions(initialPermissions);
    } else {
      setUserPlanPermissions({});
    }
  }, [selectedUser, allPlans]);

  const handlePermissionChange = (planId: string, checked: boolean) => {
    setUserPlanPermissions(prev => ({ ...prev, [planId]: checked }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser || !userProfile || userProfile.role !== 'admin' || !currentUser) {
      toast({ variant: "destructive", title: "Error", description: "No hay usuario seleccionado o no eres administrador." });
      return;
    }
    setIsSavingPermissions(true);
    try {
      let changesMade = 0;
      for (const plan of allPlans) {
        const currentPlanUserAccessList = plan.allowedUserIds; // This can be null, undefined, or string[]
        const adminWantsUserToHaveAccess = userPlanPermissions[plan.id] === true;

        let newPlanUserAccessList: string[] | null = null; // To be determined

        if (adminWantsUserToHaveAccess) {
          // Admin wants user to have access
          if (currentPlanUserAccessList === null || currentPlanUserAccessList === undefined) {
            // Plan was public, user gets added to new explicit list
            newPlanUserAccessList = [selectedUser.uid];
          } else { // Plan was already explicit (Array)
            if (!currentPlanUserAccessList.includes(selectedUser.uid)) {
              newPlanUserAccessList = [...currentPlanUserAccessList, selectedUser.uid];
            } else {
              newPlanUserAccessList = currentPlanUserAccessList; // No change needed to the list itself
            }
          }
        } else { // Admin does NOT want user to have access
          if (currentPlanUserAccessList === null || currentPlanUserAccessList === undefined) {
            // Plan was public, now restrict it by making it an empty list (denying this user, no one else explicitly allowed yet)
            newPlanUserAccessList = [];
          } else { // Plan was already explicit (Array)
            if (currentPlanUserAccessList.includes(selectedUser.uid)) {
              newPlanUserAccessList = currentPlanUserAccessList.filter(uid => uid !== selectedUser.uid);
            } else {
              newPlanUserAccessList = currentPlanUserAccessList; // No change needed to the list itself
            }
          }
        }
        
        // Determine if an actual update to Firestore is needed by comparing states
        // Normalize undefined to null for comparison to avoid unnecessary updates if backend stores null
        const normalizedCurrentPermissions = currentPlanUserAccessList === undefined ? null : currentPlanUserAccessList;
        const currentPermissionsString = normalizedCurrentPermissions === null ? "null" : JSON.stringify([...normalizedCurrentPermissions].sort());
        const newPermissionsString = newPlanUserAccessList === null ? "null" : JSON.stringify([...newPlanUserAccessList].sort());

        if (currentPermissionsString !== newPermissionsString) {
          await updatePlanAllowedUsers(plan.id, newPlanUserAccessList);
          changesMade++;
        }
      }

      if (changesMade > 0) {
        toast({ title: "Permisos Actualizados", description: `Se actualizaron los permisos para ${selectedUser.displayName || selectedUser.email}.` });
        // Re-fetch plans to get the updated allowedUserIds
        getTrainingPlans({ uid: currentUser.uid, role: 'admin' }).then(setAllPlans);
      } else {
        toast({ title: "Sin Cambios", description: "No se realizaron cambios en los permisos." });
      }

    } catch (error) {
      console.error("Error saving permissions:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudieron guardar los permisos." });
    } finally {
      setIsSavingPermissions(false);
    }
  };


  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Icons.spinner className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!currentUser || userProfile?.role !== 'admin') {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center py-10 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              Esta sección es solo para administradores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Gestionar Permisos de Usuario</CardTitle>
          <CardDescription>Selecciona un usuario para ver y editar los planes a los que tiene acceso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="user-select">Seleccionar Usuario:</Label>
            <Select
              value={selectedUser?.uid || ""}
              onValueChange={(uid) => {
                const user = allUsers.find(u => u.uid === uid);
                setSelectedUser(user || null);
              }}
              disabled={isLoadingUsers || allUsers.length === 0}
            >
              <SelectTrigger id="user-select" className="w-full md:w-[300px]">
                <SelectValue placeholder={isLoadingUsers ? "Cargando usuarios..." : "Selecciona un usuario"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingUsers ? (
                  <SelectItem value="loading" disabled>Cargando...</SelectItem>
                ) : allUsers.length === 0 ? (
                  <SelectItem value="no-users" disabled>No hay usuarios registrados.</SelectItem>
                ) : (
                  allUsers.map(user => (
                    <SelectItem key={user.uid} value={user.uid}>
                      {user.displayName || user.email} ({user.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedUser && (
            <div className="mt-6 space-y-4">
              <h3 className="text-xl font-semibold">
                Permisos para: {selectedUser.displayName || selectedUser.email}
              </h3>
              {isLoadingPlans ? (
                <div className="flex justify-center py-4">
                  <Icons.spinner className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando planes...</span>
                </div>
              ) : allPlans.length === 0 ? (
                <p className="text-muted-foreground">No hay planes de entrenamiento creados.</p>
              ) : (
                <Accordion type="multiple" className="w-full space-y-2">
                  {allPlans.map(plan => (
                    <AccordionItem key={plan.id} value={plan.id} className="rounded-md border bg-card shadow-sm">
                      <div className="flex items-center p-3 hover:bg-muted/50">
                        <Checkbox
                          id={`plan-perm-${plan.id}`}
                          checked={userPlanPermissions[plan.id] || false}
                          onCheckedChange={(checked) => handlePermissionChange(plan.id, !!checked)}
                          disabled={isSavingPermissions}
                          className="mr-3"
                        />
                        <AccordionTrigger 
                          onClick={() => fetchPlanDetails(plan.id)}
                          className="flex-1 py-0 text-left hover:no-underline"
                        >
                          <Label htmlFor={`plan-perm-${plan.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow">
                            {plan.title} {plan.template && <span className="text-xs text-muted-foreground">(Plantilla)</span>}
                            {(plan.allowedUserIds === null || plan.allowedUserIds === undefined) && <span className="ml-2 text-xs text-blue-500">(Público por defecto)</span>}
                            {(Array.isArray(plan.allowedUserIds) && plan.allowedUserIds.length === 0) && <span className="ml-2 text-xs text-orange-500">(Restringido a Nadie)</span>}
                            {(Array.isArray(plan.allowedUserIds) && plan.allowedUserIds.length > 0) && <span className="ml-2 text-xs text-green-500">(Acceso Específico)</span>}
                          </Label>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="px-4 pb-4 pl-10">
                        {isLoadingPlanDetails.has(plan.id) ? (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Cargando detalles...
                          </div>
                        ) : planDetailsCache.has(plan.id) ? (
                          <div className="space-y-2 mt-2">
                            {(planDetailsCache.get(plan.id)?.blocks || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">Este plan no tiene etapas definidas.</p>
                            ) : (planDetailsCache.get(plan.id)?.blocks || []).map(block => (
                              <div key={block.id} className="ml-4 p-2 border-l-2">
                                <p className="text-xs font-semibold">{block.title}</p>
                                <ul className="list-disc list-inside ml-4 space-y-0.5">
                                  {(planDetailsCache.get(plan.id)?.exercisesByBlock.get(block.id) || []).length === 0 ? (
                                      <li className="text-xs text-muted-foreground italic">Sin ejercicios definidos para esta etapa.</li>
                                  ) : (planDetailsCache.get(plan.id)?.exercisesByBlock.get(block.id) || []).map(exercise => (
                                    <li key={exercise.id} className="text-xs text-muted-foreground">{exercise.title}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Expande para cargar detalles.</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
              <Button onClick={handleSavePermissions} disabled={isLoadingPlans || isSavingPermissions || allPlans.length === 0}>
                {isSavingPermissions && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Permisos para {selectedUser.displayName || selectedUser.email}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

