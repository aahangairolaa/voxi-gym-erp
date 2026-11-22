/**
 * What a brand-new gym starts with (used when the VOXI team creates a gym,
 * and by the demo seed). Plain data — no imports — so scripts can use it too.
 */

export const STARTER_PLANS = [
  { name: "Monthly", durationDays: 30, price: 450, freezeDays: 0, color: "#7C5CFF", sortOrder: 1, description: "Full gym access.", features: ["Gym floor access", "Locker & towel"] },
  { name: "Quarterly", durationDays: 90, price: 1200, freezeDays: 14, color: "#5B8DEF", sortOrder: 2, description: "Three months.", features: ["Everything in Monthly", "14 freeze days"] },
  { name: "Annual", durationDays: 365, price: 3900, freezeDays: 60, color: "#B45CFF", sortOrder: 3, description: "Best value.", features: ["Everything in Quarterly", "60 freeze days", "2 PT sessions"] },
];

export const EXERCISE_LIBRARY: [name: string, muscleGroup: string, equipment: string][] = [
  ["Barbell Back Squat", "Legs", "Barbell"], ["Romanian Deadlift", "Legs", "Barbell"], ["Leg Press", "Legs", "Machine"],
  ["Walking Lunges", "Legs", "Dumbbell"], ["Leg Curl", "Legs", "Machine"], ["Hip Thrust", "Legs", "Barbell"],
  ["Bench Press", "Chest", "Barbell"], ["Incline Dumbbell Press", "Chest", "Dumbbell"], ["Cable Fly", "Chest", "Cable"], ["Push-up", "Chest", "Bodyweight"],
  ["Deadlift", "Back", "Barbell"], ["Pull-up", "Back", "Bodyweight"], ["Lat Pulldown", "Back", "Cable"], ["Seated Cable Row", "Back", "Cable"], ["Single-arm DB Row", "Back", "Dumbbell"],
  ["Overhead Press", "Shoulders", "Barbell"], ["Lateral Raise", "Shoulders", "Dumbbell"], ["Face Pull", "Shoulders", "Cable"],
  ["Barbell Curl", "Arms", "Barbell"], ["Triceps Pushdown", "Arms", "Cable"], ["Hammer Curl", "Arms", "Dumbbell"],
  ["Plank", "Core", "Bodyweight"], ["Hanging Knee Raise", "Core", "Bodyweight"], ["Cable Woodchop", "Core", "Cable"],
  ["Kettlebell Swing", "Full body", "Kettlebell"], ["Burpee", "Full body", "Bodyweight"], ["Thruster", "Full body", "Barbell"],
  ["Rowing Machine", "Cardio", "Machine"], ["Assault Bike", "Cardio", "Machine"], ["Incline Treadmill Walk", "Cardio", "Machine"],
];


