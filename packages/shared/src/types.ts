export type UserRole = "trainer" | "student";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "calves"
  | "abs"
  | "cardio"
  | "full_body";

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Peito",
  back: "Costas",
  shoulders: "Ombro",
  biceps: "Bíceps",
  triceps: "Tríceps",
  legs: "Pernas",
  glutes: "Glúteos",
  calves: "Panturrilha",
  abs: "Abdômen",
  cardio: "Cardio",
  full_body: "Corpo inteiro",
};

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  trainer_id: string | null;
  active: boolean;
  created_at: string;
};

export type Exercise = {
  id: string;
  trainer_id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  instructions: string | null;
  created_at: string;
};

export type WorkoutPlan = {
  id: string;
  trainer_id: string;
  student_id: string;
  name: string;
  order_index: number;
  active: boolean;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutPlanExercise = {
  id: string;
  workout_plan_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  load_kg: number | null;
  notes: string | null;
  warmup_sets: number;
  warmup_reps: string | null;
  prep_sets: number;
  prep_reps: string | null;
  exercise?: Exercise;
};

export type WorkoutLog = {
  id: string;
  student_id: string;
  workout_plan_id: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  effort_rating: number | null;
  notes: string | null;
  photo_url: string | null;
};

export type SetType = "warmup" | "prep" | "valid";

export const EFFORT_LABELS: { value: number; label: string; emoji: string }[] = [
  { value: 1, label: "Leve", emoji: "😊" },
  { value: 2, label: "Fácil", emoji: "🙂" },
  { value: 3, label: "Médio", emoji: "😐" },
  { value: 4, label: "Forte", emoji: "😓" },
  { value: 5, label: "Intenso", emoji: "😫" },
];

export type WorkoutLogSet = {
  id: string;
  workout_log_id: string;
  workout_plan_exercise_id: string;
  set_type: SetType;
  set_number: number;
  reps_done: number | null;
  load_kg_done: number | null;
  completed: boolean;
  created_at: string;
};

export type CardioActivity =
  | "walking"
  | "running"
  | "cycling"
  | "elliptical"
  | "stair_climber"
  | "jump_rope"
  | "rowing"
  | "other";

export const CARDIO_ACTIVITY_LABELS: Record<CardioActivity, string> = {
  walking: "Caminhada",
  running: "Corrida",
  cycling: "Bike",
  elliptical: "Elíptico",
  stair_climber: "Escada",
  jump_rope: "Pular corda",
  rowing: "Remo",
  other: "Outro",
};

export type CardioIntensity = "light" | "moderate" | "intense";

export const CARDIO_INTENSITY_LABELS: Record<CardioIntensity, string> = {
  light: "Leve",
  moderate: "Moderada",
  intense: "Intensa",
};

export type CardioSession = {
  id: string;
  trainer_id: string;
  student_id: string;
  name: string;
  activity: CardioActivity;
  intensity: CardioIntensity;
  duration_minutes: number;
  instructions: string | null;
  order_index: number;
  active: boolean;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

export type CardioLog = {
  id: string;
  student_id: string;
  cardio_session_id: string;
  duration_minutes_done: number | null;
  distance_km: number | null;
  notes: string | null;
  completed_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [
          {
            foreignKeyName: "profiles_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: Exercise;
        Insert: Partial<Exercise>;
        Update: Partial<Exercise>;
        Relationships: [
          {
            foreignKeyName: "exercises_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plans: {
        Row: WorkoutPlan;
        Insert: Partial<WorkoutPlan>;
        Update: Partial<WorkoutPlan>;
        Relationships: [
          {
            foreignKeyName: "workout_plans_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_plans_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plan_exercises: {
        Row: WorkoutPlanExercise;
        Insert: Partial<WorkoutPlanExercise>;
        Update: Partial<WorkoutPlanExercise>;
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_logs: {
        Row: WorkoutLog;
        Insert: Partial<WorkoutLog>;
        Update: Partial<WorkoutLog>;
        Relationships: [
          {
            foreignKeyName: "workout_logs_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_logs_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_log_sets: {
        Row: WorkoutLogSet;
        Insert: Partial<WorkoutLogSet>;
        Update: Partial<WorkoutLogSet>;
        Relationships: [
          {
            foreignKeyName: "workout_log_sets_workout_log_id_fkey";
            columns: ["workout_log_id"];
            isOneToOne: false;
            referencedRelation: "workout_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_log_sets_workout_plan_exercise_id_fkey";
            columns: ["workout_plan_exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_plan_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      cardio_sessions: {
        Row: CardioSession;
        Insert: Partial<CardioSession>;
        Update: Partial<CardioSession>;
        Relationships: [
          {
            foreignKeyName: "cardio_sessions_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cardio_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cardio_logs: {
        Row: CardioLog;
        Insert: Partial<CardioLog>;
        Update: Partial<CardioLog>;
        Relationships: [
          {
            foreignKeyName: "cardio_logs_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cardio_logs_cardio_session_id_fkey";
            columns: ["cardio_session_id"];
            isOneToOne: false;
            referencedRelation: "cardio_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      user_role: UserRole;
      muscle_group: MuscleGroup;
      set_type: SetType;
      cardio_activity: CardioActivity;
      cardio_intensity: CardioIntensity;
    };
    CompositeTypes: Record<never, never>;
  };
};
