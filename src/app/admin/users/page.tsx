
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getAllUserProfiles } from "@/services/auth";
import { getTrainingPlans, updatePlanAllowedUsers } from "@/services/firestore";
import type { UserProfile, TrainingPlan } from "@/types/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface UserPlanPermissions {
  [planId: string]: boolean;
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
        .then(setAllPlans)
        .catch(err => {
          console.error("Error fetching all plans:", err);
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los planes." });
        })
        .finally(() => setIsLoadingPlans(false));
    }
  }, [userProfile, currentUser, toast]);

  // Effect to update UI when selectedUser or allPlans change
  useEffect(() => {
    if (selectedUser && allPlans.length > 0) {
      const initialPermissions: UserPlanPermissions = {};
      allPlans.forEach(plan => {
        // A user has access if:
        // 1. The plan's allowedUserIds is undefined/null/empty (i.e., public for authenticated users)
        // OR
        // 2. The user's UID is explicitly in the plan's allowedUserIds list.
        const isPublicPlan = !plan.allowedUserIds || plan.allowedUserIds.length === 0;
        const isExplicitlyAllowed = plan.allowedUserIds?.includes(selectedUser.uid) || false;
        
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
    if (!selectedUser || !userProfile || userProfile.role !== 'admin') {
      toast({ variant: "destructive", title: "Error", description: "No hay usuario seleccionado o no eres administrador." });
      return;
    }
    setIsSavingPermissions(true);
    try {
      let changesMade = 0;
      for (const plan of allPlans) {
        const currentAllowedUserIds = plan.allowedUserIds || [];
        const userHasUiPermission = userPlanPermissions[plan.id] === true;
        const userIsInDbAllowedList = currentAllowedUserIds.includes(selectedUser.uid);

        let newAllowedUserIds = [...currentAllowedUserIds];
        let needsUpdate = false;

        if (userHasUiPermission && !userIsInDbAllowedList) {
          // Admin wants to grant access, and user is not currently in the list
          newAllowedUserIds.push(selectedUser.uid);
          needsUpdate = true;
        } else if (!userHasUiPermission && userIsInDbAllowedList) {
          // Admin wants to revoke access, and user is currently in the list
          newAllowedUserIds = newAllowedUserIds.filter(uid => uid !== selectedUser.uid);
          needsUpdate = true;
        }
        // If the plan was public (empty allowedUserIds) and admin wants to restrict it (unchecks for user),
        // the list should only contain the current user IF they were granted access.
        // This logic might need refinement if we want to differentiate "public" from "explicitly assigned".
        // For now, checking/unchecking directly adds/removes.

        if (needsUpdate) {
          await updatePlanAllowedUsers(plan.id, newAllowedUserIds);
          changesMade++;
        }
      }

      if (changesMade > 0) {
        toast({ title: "Permisos Actualizados", description: `Se actualizaron los permisos para ${selectedUser.displayName || selectedUser.email}.` });
        // Re-fetch plans to get the updated allowedUserIds
        getTrainingPlans({ uid: currentUser?.uid || null, role: 'admin' }).then(setAllPlans);
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
                <div className="space-y-3">
                  {allPlans.map(plan => (
                    <div key={plan.id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50">
                      <Checkbox
                        id={`plan-perm-${plan.id}`}
                        checked={userPlanPermissions[plan.id] || false}
                        onCheckedChange={(checked) => handlePermissionChange(plan.id, !!checked)}
                        disabled={isSavingPermissions}
                      />
                      <Label htmlFor={`plan-perm-${plan.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {plan.title} {plan.template && <span className="text-xs text-muted-foreground">(Plantilla)</span>}
                      </Label>
                    </div>
                  ))}
                </div>
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
