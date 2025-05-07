
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState, useCallback } from "react";

import { createSession } from "@/services/session";
const Dashboard = () => {
  const [date, setDate] = useState<Date>();

  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Session Logging Card */}
        <Card>
        
            
            
            
          <CardHeader>
            <CardTitle>Log New Session</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Start tracking your horse&apos;s progress.
            </p>
            <Button
              className="mt-4"
              disabled={!date}
              onClick={async () => {
                console.log("Create Session clicked");
                console.log("Date:", date);
                if (date) {
                  const sessionData = {
                    date: date.toISOString().split("T")[0],
                    time: new Date().toLocaleTimeString(),
                    horse: "Default Horse", // Placeholder
                    duration: 60, // Placeholder
                    notes: "", // Placeholder
                  };
                  console.log("Calling createSession");
                  const result = await createSession(sessionData);
                  console.log("SessionId or error:", result);
                  if (result) {
                    window.location.href = `/session/${result}`;
                  } else {
                    alert(
                      "Failed to create session. Please check the console for more details."
                    );
                  }
                }
              }}              

              
              
            >
              Create Session</Button>
          </CardContent>
        </Card>

        {/* Progress Tracking Card */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View your horse&apos;s training data and progress charts.
            </p>
            <Button variant="secondary" className="mt-4">
              View Progress
            </Button>
          </CardContent>
        </Card>

        {/* AI Session Analysis Card */}
        <Card>
          <CardHeader>
            <CardTitle>AI Session Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analyze session notes and identify patterns.
            </p>
            <Button variant="secondary" className="mt-4">
              Analyze Sessions
            </Button>
          </CardContent>
        </Card>
          {/* Calendar Card */}
        <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Training Calendar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
              {date ? (
                <p className="text-center text-sm font-medium">
                  {date.toLocaleDateString()}
                </p>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Select a date.
                </p>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default Dashboard;

