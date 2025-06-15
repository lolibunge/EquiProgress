
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getAllUserProfiles } from "@/services/auth";
import { 
    getTrainingPlans, 
    updatePlanAllowedUsers, 
    getTrainingBlocks, 
    getExercisesForBlock, 
    updateBlockUserPermissions,
    updateExerciseUserPermissions,
    type TrainingBlock, 
    type BlockExerciseDisplay,
    type ExerciseReference 
} from "@/services/firestore";
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
interface UserBlockPermissions {
  [blockId: string]: boolean;
}
interface UserExercisePermissions {
  [compositeKey: string]: boolean; // e.g., blockId_exerciseId
}

interface PlanDetails {
  blocks: TrainingBlock[];
  exercisesByBlock: Map<string, BlockExerciseDisplay[]>; // Key is blockId
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
  const [userBlockPermissions, setUserBlockPermissions] = useState<UserBlockPermissions>({});
  const [userExercisePermissions, setUserExercisePermissions] = useState<UserExercisePermissions>({});
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
      const blocks = (await getTrainingBlocks(planId, {uid: currentUser?.uid || null, role: 'admin'})).sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity));
      const exercisesByBlock = new Map<string, BlockExerciseDisplay[]>();
      for (const block of blocks) {
        // For admin view, we fetch all exercises regardless of user-specific permissions for display
        const exercises = (await getExercisesForBlock(block.id, {uid: currentUser?.uid || null, role: 'admin'})).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity));
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
  }, [planDetailsCache, isLoadingPlanDetails, toast, currentUser]);


  // Effect to update UI when selectedUser, allPlans, or planDetailsCache change
  useEffect(() => {
    if (selectedUser && allPlans.length > 0) {
      const initialPlanPerms: UserPlanPermissions = {};
      const initialBlockPerms: UserBlockPermissions = {};
      const initialExercisePerms: UserExercisePermissions = {};

      allPlans.forEach(plan => {
        const isPlanPublic = plan.allowedUserIds === null || plan.allowedUserIds === undefined;
        const isPlanExplicitlyAllowed = Array.isArray(plan.allowedUserIds) && plan.allowedUserIds.includes(selectedUser.uid);
        const userHasPlanAccess = isPlanPublic || isPlanExplicitlyAllowed;
        initialPlanPerms[plan.id] = userHasPlanAccess;

        const details = planDetailsCache.get(plan.id);
        if (details) {
          details.blocks.forEach(block => {
            let userHasBlockAccess = false;
            // A block is accessible if the plan is accessible AND (block is public OR block explicitly allows user)
            if (userHasPlanAccess) { 
                const isBlockPublicInherit = block.allowedUserIds === null || block.allowedUserIds === undefined;
                const isBlockExplicitlyAllowed = Array.isArray(block.allowedUserIds) && block.allowedUserIds.includes(selectedUser.uid);
                userHasBlockAccess = isBlockPublicInherit || isBlockExplicitlyAllowed;
            }
            initialBlockPerms[block.id] = userHasBlockAccess;

            const exercises = details.exercisesByBlock.get(block.id) || [];
            exercises.forEach(exercise => { // exercise here is BlockExerciseDisplay
              let userHasExerciseAccess = false;
              // An exercise is accessible if its block is accessible AND (exercise is public OR exercise explicitly allows user)
              if (userHasBlockAccess) { 
                const exRef = block.exerciseReferences?.find(ref => ref.exerciseId === exercise.id); // Find the original reference for its allowedUserIds
                const isExercisePublicInherit = exRef?.allowedUserIds === null || exRef?.allowedUserIds === undefined;
                const isExerciseExplicitlyAllowed = Array.isArray(exRef?.allowedUserIds) && exRef.allowedUserIds.includes(selectedUser.uid);
                userHasExerciseAccess = isExercisePublicInherit || isExerciseExplicitlyAllowed;
              }
              initialExercisePerms[`${block.id}_${exercise.id}`] = userHasExerciseAccess;
            });
          });
        }
      });
      setUserPlanPermissions(initialPlanPerms);
      setUserBlockPermissions(initialBlockPerms);
      setUserExercisePermissions(initialExercisePerms);

    } else {
      setUserPlanPermissions({});
      setUserBlockPermissions({});
      setUserExercisePermissions({});
    }
  }, [selectedUser, allPlans, planDetailsCache]);


  const handlePermissionChange = (type: 'plan' | 'block' | 'exercise', id: string, checked: boolean, parentId?: string) => {
    if (type === 'plan') {
      setUserPlanPermissions(prev => ({ ...prev, [id]: checked }));
    } else if (type === 'block') {
      setUserBlockPermissions(prev => ({ ...prev, [id]: checked }));
    } else if (type === 'exercise' && parentId) { // exercise ID is masterExerciseId, parentId is blockId
      setUserExercisePermissions(prev => ({ ...prev, [`${parentId}_${id}`]: checked }));
    }
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
        const currentPlanUserAccessList = plan.allowedUserIds; // From current state before this save
        const adminWantsUserToHavePlanAccess = userPlanPermissions[plan.id] === true;
        let newPlanUserAccessList: string[] | null = null;

        if (adminWantsUserToHavePlanAccess) {
          newPlanUserAccessList = (currentPlanUserAccessList === null || currentPlanUserAccessList === undefined)
            ? [selectedUser.uid] // Was public, now explicit for this user (and others if any were already there implicitly for admin)
            : Array.isArray(currentPlanUserAccessList) && !currentPlanUserAccessList.includes(selectedUser.uid)
              ? [...currentPlanUserAccessList, selectedUser.uid] // Add user to existing list
              : currentPlanUserAccessList; // No change needed or already includes user
        } else { // Admin wants to remove access or ensure no access
          newPlanUserAccessList = (currentPlanUserAccessList === null || currentPlanUserAccessList === undefined)
            ? [] // Was public, make it private to all (empty array), effectively denying this user
            : Array.isArray(currentPlanUserAccessList) && currentPlanUserAccessList.includes(selectedUser.uid)
              ? currentPlanUserAccessList.filter(uid => uid !== selectedUser.uid) // Remove user from existing list
              : currentPlanUserAccessList; // No change, user wasn't in the list or it was already []
        }
        
        const planPermChanged = JSON.stringify(currentPlanUserAccessList?.sort() || null) !== JSON.stringify(newPlanUserAccessList?.sort() || null);
        if (planPermChanged) {
          await updatePlanAllowedUsers(plan.id, newPlanUserAccessList);
          changesMade++;
        }

        // Process blocks for this plan
        const details = planDetailsCache.get(plan.id);
        if (details) {
          for (const block of details.blocks) {
            const originalBlockFromCache = allPlans.find(p => p.id === plan.id)
                                          ?.blocks?.find(b => b.id === block.id); // Get original from allPlans if needed, or use cache
            const currentBlockUserAccessList = originalBlockFromCache?.allowedUserIds ?? block.allowedUserIds;
            const adminWantsUserToHaveBlockAccess = userBlockPermissions[block.id] === true;
            let newBlockUserAccessList: string[] | null = null;

            if (adminWantsUserToHaveBlockAccess) {
              newBlockUserAccessList = (currentBlockUserAccessList === null || currentBlockUserAccessList === undefined)
                ? [selectedUser.uid]
                : Array.isArray(currentBlockUserAccessList) && !currentBlockUserAccessList.includes(selectedUser.uid)
                  ? [...currentBlockUserAccessList, selectedUser.uid]
                  : currentBlockUserAccessList;
            } else {
              newBlockUserAccessList = (currentBlockUserAccessList === null || currentBlockUserAccessList === undefined)
                ? [] 
                : Array.isArray(currentBlockUserAccessList) && currentBlockUserAccessList.includes(selectedUser.uid)
                  ? currentBlockUserAccessList.filter(uid => uid !== selectedUser.uid)
                  : currentBlockUserAccessList;
            }
            const blockPermChanged = JSON.stringify(currentBlockUserAccessList?.sort() || null) !== JSON.stringify(newBlockUserAccessList?.sort() || null);
            if (blockPermChanged) {
              await updateBlockUserPermissions(block.id, newBlockUserAccessList);
              changesMade++;
            }

            // Process exercises for this block
            const exercisesInBlock = details.exercisesByBlock.get(block.id) || [];
            const blockFromCacheForExercises = planDetailsCache.get(plan.id)?.blocks.find(b => b.id === block.id);

            for (const exercise of exercisesInBlock) { // exercise is BlockExerciseDisplay
              const exerciseRef = blockFromCacheForExercises?.exerciseReferences?.find(ref => ref.exerciseId === exercise.id);
              const currentExerciseUserAccessList = exerciseRef?.allowedUserIds;
              const adminWantsUserToHaveExerciseAccess = userExercisePermissions[`${block.id}_${exercise.id}`] === true;
              let newExerciseUserAccessList: string[] | null = null;

              if (adminWantsUserToHaveExerciseAccess) {
                 newExerciseUserAccessList = (currentExerciseUserAccessList === null || currentExerciseUserAccessList === undefined)
                    ? [selectedUser.uid]
                    : Array.isArray(currentExerciseUserAccessList) && !currentExerciseUserAccessList.includes(selectedUser.uid)
                        ? [...currentExerciseUserAccessList, selectedUser.uid]
                        : currentExerciseUserAccessList;
              } else {
                newExerciseUserAccessList = (currentExerciseUserAccessList === null || currentExerciseUserAccessList === undefined)
                    ? []
                    : Array.isArray(currentExerciseUserAccessList) && currentExerciseUserAccessList.includes(selectedUser.uid)
                        ? currentExerciseUserAccessList.filter(uid => uid !== selectedUser.uid)
                        : currentExerciseUserAccessList;
              }
              const exercisePermChanged = JSON.stringify(currentExerciseUserAccessList?.sort() || null) !== JSON.stringify(newExerciseUserAccessList?.sort() || null);
              if (exercisePermChanged) {
                await updateExerciseUserPermissions(block.id, exercise.id, newExerciseUserAccessList);
                changesMade++;
              }
            }
          }
        }
      }

      if (changesMade > 0) {
        toast({ title: "Permisos Actualizados", description: `Se actualizaron los permisos para ${selectedUser.displayName || selectedUser.email}.` });
        
        // Re-fetch plans to get the latest top-level allowedUserIds
        const refreshedPlans = await getTrainingPlans({ uid: currentUser.uid, role: 'admin' });
        setAllPlans(refreshedPlans);
        
        // Re-fetch details for all plans that were previously loaded into cache
        // to get updated block and exercise allowedUserIds
        if (refreshedPlans.length > 0) {
            const newCache = new Map<string, PlanDetails>();
            const plansToRefreshDetails = Array.from(planDetailsCache.keys()); // Get all plan IDs that were in the cache
            
            for (const planIdToRefresh of plansToRefreshDetails) {
                const planExistsInRefreshed = refreshedPlans.find(p => p.id === planIdToRefresh);
                if(planExistsInRefreshed) { // Only refresh if plan still exists
                    setIsLoadingPlanDetails(prev => new Set(prev).add(planIdToRefresh));
                    try {
                        const blocks = (await getTrainingBlocks(planIdToRefresh, {uid: currentUser?.uid || null, role: 'admin'})).sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity));
                        const exercisesByBlock = new Map<string, BlockExerciseDisplay[]>();
                        for (const blk of blocks) {
                            const exercises = (await getExercisesForBlock(blk.id, {uid: currentUser?.uid || null, role: 'admin'})).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity));
                            exercisesByBlock.set(blk.id, exercises);
                        }
                        newCache.set(planIdToRefresh, { blocks, exercisesByBlock });
                    } catch (error) {
                        console.error(`Error re-fetching details for plan ${planIdToRefresh}:`, error);
                    } finally {
                        setIsLoadingPlanDetails(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(planIdToRefresh);
                            return newSet;
                        });
                    }
                }
            }
            // Update cache with newly fetched details. This ensures that if a plan was removed, it's no longer in newCache.
            setPlanDetailsCache(newCache); 
        } else {
            setPlanDetailsCache(new Map()); // Clear cache if no plans exist anymore
        }

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
  
  const getAccessStatusText = (allowedIds: string[] | null | undefined, itemType: 'plan' | 'etapa' | 'ejercicio') => {
    if (allowedIds === null || allowedIds === undefined) return `(Hereda / Público por defecto para ${itemType})`;
    if (Array.isArray(allowedIds) && allowedIds.length === 0) return `(Restringido a Nadie para ${itemType})`;
    if (Array.isArray(allowedIds) && allowedIds.length > 0) return `(Acceso Específico para ${itemType})`;
    return "";
  };


  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Gestionar Permisos de Usuario</CardTitle>
          <CardDescription>Selecciona un usuario para ver y editar los planes, etapas y ejercicios a los que tiene acceso.</CardDescription>
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
                  {allPlans.map(plan => {
                    const isPlanAllowedForUser = userPlanPermissions[plan.id] || false;
                    const planAccessStatusText = getAccessStatusText(plan.allowedUserIds, 'plan');
                    return (
                    <AccordionItem key={plan.id} value={plan.id} className="rounded-md border bg-card shadow-sm">
                      <div className="flex items-center p-3 hover:bg-muted/50">
                        <Checkbox
                          id={`plan-perm-${plan.id}`}
                          checked={isPlanAllowedForUser}
                          onCheckedChange={(checked) => handlePermissionChange('plan', plan.id, !!checked)}
                          disabled={isSavingPermissions}
                          className="mr-3"
                        />
                        <AccordionTrigger 
                          onClick={() => fetchPlanDetails(plan.id)}
                          className="flex-1 py-0 text-left hover:no-underline"
                        >
                          <Label htmlFor={`plan-perm-${plan.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow">
                            {plan.title} {plan.template && <span className="text-xs text-muted-foreground">(Plantilla)</span>}
                            <span className="ml-2 text-xs text-muted-foreground">{planAccessStatusText}</span>
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
                                <p className="text-xs text-muted-foreground">Este plan no tiene etapas.</p>
                            ) : (planDetailsCache.get(plan.id)?.blocks || []).map(block => {
                                const isBlockAllowedForUser = userBlockPermissions[block.id] || false;
                                const blockAccessStatusText = getAccessStatusText(block.allowedUserIds, 'etapa');
                                return (
                                  <div key={block.id} className="ml-4 p-3 border-l-2 rounded-r-md bg-muted/30">
                                    <div className="flex items-center mb-1">
                                        <Checkbox
                                            id={`block-perm-${block.id}`}
                                            checked={isBlockAllowedForUser}
                                            onCheckedChange={(checked) => handlePermissionChange('block', block.id, !!checked)}
                                            disabled={isSavingPermissions || !isPlanAllowedForUser} // Disable if parent plan is not allowed
                                            className="mr-2 h-3.5 w-3.5"
                                        />
                                        <Label htmlFor={`block-perm-${block.id}`} className="text-xs font-semibold peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {block.title} <span className="text-xs text-muted-foreground/80">{blockAccessStatusText}</span>
                                        </Label>
                                    </div>
                                    <ul className="list-none ml-6 space-y-0.5">
                                      {(planDetailsCache.get(plan.id)?.exercisesByBlock.get(block.id) || []).length === 0 ? (
                                          <li className="text-xs text-muted-foreground italic">Sin ejercicios para esta etapa.</li>
                                      ) : (planDetailsCache.get(plan.id)?.exercisesByBlock.get(block.id) || []).map(exercise => {
                                          const exerciseRef = block.exerciseReferences?.find(ref => ref.exerciseId === exercise.id);
                                          const isExerciseAllowedForUser = userExercisePermissions[`${block.id}_${exercise.id}`] || false;
                                          const exerciseAccessStatusText = getAccessStatusText(exerciseRef?.allowedUserIds, 'ejercicio');
                                          return (
                                            <li key={exercise.id} className="flex items-center">
                                                <Checkbox
                                                    id={`exercise-perm-${block.id}-${exercise.id}`}
                                                    checked={isExerciseAllowedForUser}
                                                    onCheckedChange={(checked) => handlePermissionChange('exercise', exercise.id, !!checked, block.id)}
                                                    disabled={isSavingPermissions || !isBlockAllowedForUser} // Disable if parent block is not allowed
                                                    className="mr-2 h-3 w-3"
                                                />
                                                <Label htmlFor={`exercise-perm-${block.id}-${exercise.id}`} className="text-xs text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {exercise.title} <span className="text-xs text-muted-foreground/70">{exerciseAccessStatusText}</span>
                                                </Label>
                                            </li>
                                          );
                                      })}
                                    </ul>
                                  </div>
                                );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Expande para cargar detalles y permisos de etapas/ejercicios.</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )})}
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

