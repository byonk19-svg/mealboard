export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      baby_food_statuses: {
        Row: {
          baby_profile_id: string
          created_at: string
          food_id: string
          household_id: string
          id: string
          last_offered_on: string | null
          notes: string | null
          prep_notes: string | null
          status: Database["public"]["Enums"]["baby_food_status"]
          updated_at: string
        }
        Insert: {
          baby_profile_id: string
          created_at?: string
          food_id: string
          household_id: string
          id?: string
          last_offered_on?: string | null
          notes?: string | null
          prep_notes?: string | null
          status: Database["public"]["Enums"]["baby_food_status"]
          updated_at?: string
        }
        Update: {
          baby_profile_id?: string
          created_at?: string
          food_id?: string
          household_id?: string
          id?: string
          last_offered_on?: string | null
          notes?: string | null
          prep_notes?: string | null
          status?: Database["public"]["Enums"]["baby_food_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "baby_food_statuses_baby_profile_id_household_id_fkey"
            columns: ["baby_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "baby_food_statuses_food_id_household_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "baby_food_statuses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      cooking_session_ingredients: {
        Row: {
          cooking_session_id: string
          created_at: string
          display_name: string
          food_id: string | null
          household_id: string
          id: string
          is_ready: boolean
          notes: string | null
          optional: boolean
          preparation: string | null
          quantity: number | null
          ready_at: string | null
          recipe_ingredient_id: string | null
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          cooking_session_id: string
          created_at?: string
          display_name: string
          food_id?: string | null
          household_id: string
          id?: string
          is_ready?: boolean
          notes?: string | null
          optional?: boolean
          preparation?: string | null
          quantity?: number | null
          ready_at?: string | null
          recipe_ingredient_id?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          cooking_session_id?: string
          created_at?: string
          display_name?: string
          food_id?: string | null
          household_id?: string
          id?: string
          is_ready?: boolean
          notes?: string | null
          optional?: boolean
          preparation?: string | null
          quantity?: number | null
          ready_at?: string | null
          recipe_ingredient_id?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooking_session_ingredients_cooking_session_id_household_i_fkey"
            columns: ["cooking_session_id", "household_id"]
            isOneToOne: false
            referencedRelation: "cooking_sessions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "cooking_session_ingredients_food_id_household_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "cooking_session_ingredients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooking_session_ingredients_recipe_ingredient_id_household_fkey"
            columns: ["recipe_ingredient_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipe_ingredients"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      cooking_session_steps: {
        Row: {
          completed_at: string | null
          cooking_session_id: string
          created_at: string
          household_id: string
          id: string
          instruction: string
          is_completed: boolean
          recipe_step_id: string | null
          section_label: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          cooking_session_id: string
          created_at?: string
          household_id: string
          id?: string
          instruction: string
          is_completed?: boolean
          recipe_step_id?: string | null
          section_label?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          cooking_session_id?: string
          created_at?: string
          household_id?: string
          id?: string
          instruction?: string
          is_completed?: boolean
          recipe_step_id?: string | null
          section_label?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooking_session_steps_cooking_session_id_household_id_fkey"
            columns: ["cooking_session_id", "household_id"]
            isOneToOne: false
            referencedRelation: "cooking_sessions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "cooking_session_steps_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooking_session_steps_recipe_step_id_household_id_fkey"
            columns: ["recipe_step_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipe_steps"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      cooking_sessions: {
        Row: {
          abandoned_at: string | null
          completed_at: string | null
          created_at: string
          current_step_sort_order: number | null
          household_id: string
          id: string
          notes: string | null
          paused_at: string | null
          recipe_id: string
          recipe_name_snapshot: string
          recipe_updated_at_snapshot: string | null
          scale_factor_snapshot: number
          servings_snapshot: number | null
          started_at: string
          status: Database["public"]["Enums"]["cooking_session_status"]
          substitutions: string | null
          updated_at: string
          weekly_plan_item_id: string | null
        }
        Insert: {
          abandoned_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_step_sort_order?: number | null
          household_id: string
          id?: string
          notes?: string | null
          paused_at?: string | null
          recipe_id: string
          recipe_name_snapshot: string
          recipe_updated_at_snapshot?: string | null
          scale_factor_snapshot?: number
          servings_snapshot?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["cooking_session_status"]
          substitutions?: string | null
          updated_at?: string
          weekly_plan_item_id?: string | null
        }
        Update: {
          abandoned_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_step_sort_order?: number | null
          household_id?: string
          id?: string
          notes?: string | null
          paused_at?: string | null
          recipe_id?: string
          recipe_name_snapshot?: string
          recipe_updated_at_snapshot?: string | null
          scale_factor_snapshot?: number
          servings_snapshot?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["cooking_session_status"]
          substitutions?: string | null
          updated_at?: string
          weekly_plan_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cooking_sessions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooking_sessions_recipe_id_household_id_fkey"
            columns: ["recipe_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "cooking_sessions_weekly_plan_item_id_household_id_fkey"
            columns: ["weekly_plan_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_plan_items"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      cooking_timers: {
        Row: {
          canceled_at: string | null
          cooking_session_id: string
          cooking_session_step_id: string | null
          created_at: string
          dismissed_at: string | null
          duration_seconds: number
          expired_at: string | null
          expires_at: string | null
          household_id: string
          id: string
          label: string | null
          paused_at: string | null
          remaining_seconds: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["cooking_timer_status"]
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          cooking_session_id: string
          cooking_session_step_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          duration_seconds: number
          expired_at?: string | null
          expires_at?: string | null
          household_id: string
          id?: string
          label?: string | null
          paused_at?: string | null
          remaining_seconds?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["cooking_timer_status"]
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          cooking_session_id?: string
          cooking_session_step_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          duration_seconds?: number
          expired_at?: string | null
          expires_at?: string | null
          household_id?: string
          id?: string
          label?: string | null
          paused_at?: string | null
          remaining_seconds?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["cooking_timer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooking_timers_cooking_session_id_household_id_fkey"
            columns: ["cooking_session_id", "household_id"]
            isOneToOne: false
            referencedRelation: "cooking_sessions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "cooking_timers_cooking_session_step_id_household_id_cookin_fkey"
            columns: [
              "cooking_session_step_id",
              "household_id",
              "cooking_session_id",
            ]
            isOneToOne: false
            referencedRelation: "cooking_session_steps"
            referencedColumns: ["id", "household_id", "cooking_session_id"]
          },
          {
            foreignKeyName: "cooking_timers_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      food_preferences: {
        Row: {
          created_at: string
          food_id: string
          household_id: string
          id: string
          meal_profile_id: string
          notes: string | null
          preference: Database["public"]["Enums"]["food_preference_level"]
          prep_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          food_id: string
          household_id: string
          id?: string
          meal_profile_id: string
          notes?: string | null
          preference: Database["public"]["Enums"]["food_preference_level"]
          prep_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          food_id?: string
          household_id?: string
          id?: string
          meal_profile_id?: string
          notes?: string | null
          preference?: Database["public"]["Enums"]["food_preference_level"]
          prep_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_preferences_food_id_household_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "food_preferences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_preferences_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      foods: {
        Row: {
          archived_at: string | null
          created_at: string
          default_grocery_category_id: string | null
          default_unit: string | null
          household_id: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          default_grocery_category_id?: string | null
          default_unit?: string | null
          household_id: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          default_grocery_category_id?: string | null
          default_unit?: string | null
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "foods_default_grocery_category_id_household_id_fkey"
            columns: ["default_grocery_category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "foods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          heb_label: string | null
          household_id: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          heb_label?: string | null
          household_id: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          heb_label?: string | null
          household_id?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_item_sources: {
        Row: {
          created_at: string
          grocery_list_item_id: string
          household_id: string
          id: string
          meal_profile_id: string | null
          notes: string | null
          quantity: number | null
          recipe_id: string | null
          recipe_ingredient_id: string | null
          source_id: string | null
          source_label: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          unit: string | null
          weekly_plan_item_id: string | null
        }
        Insert: {
          created_at?: string
          grocery_list_item_id: string
          household_id: string
          id?: string
          meal_profile_id?: string | null
          notes?: string | null
          quantity?: number | null
          recipe_id?: string | null
          recipe_ingredient_id?: string | null
          source_id?: string | null
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          unit?: string | null
          weekly_plan_item_id?: string | null
        }
        Update: {
          created_at?: string
          grocery_list_item_id?: string
          household_id?: string
          id?: string
          meal_profile_id?: string | null
          notes?: string | null
          quantity?: number | null
          recipe_id?: string | null
          recipe_ingredient_id?: string | null
          source_id?: string | null
          source_label?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          unit?: string | null
          weekly_plan_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_item_sources_grocery_list_item_id_household_id_fkey"
            columns: ["grocery_list_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_list_items"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "grocery_item_sources_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_item_sources_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "grocery_item_sources_recipe_id_household_id_fkey"
            columns: ["recipe_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "grocery_item_sources_recipe_ingredient_id_household_id_fkey"
            columns: ["recipe_ingredient_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipe_ingredients"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "grocery_item_sources_weekly_plan_item_id_fkey"
            columns: ["weekly_plan_item_id"]
            isOneToOne: false
            referencedRelation: "weekly_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_list_items: {
        Row: {
          already_have: boolean
          checked: boolean
          created_at: string
          display_name: string
          food_id: string | null
          grocery_category_id: string | null
          grocery_list_id: string
          household_id: string
          id: string
          manual_item: boolean
          needs_review: boolean
          notes: string | null
          preferred_product_id: string | null
          preferred_quantity_text: string | null
          quantity: number | null
          review_reason: string | null
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          already_have?: boolean
          checked?: boolean
          created_at?: string
          display_name: string
          food_id?: string | null
          grocery_category_id?: string | null
          grocery_list_id: string
          household_id: string
          id?: string
          manual_item?: boolean
          needs_review?: boolean
          notes?: string | null
          preferred_product_id?: string | null
          preferred_quantity_text?: string | null
          quantity?: number | null
          review_reason?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          already_have?: boolean
          checked?: boolean
          created_at?: string
          display_name?: string
          food_id?: string | null
          grocery_category_id?: string | null
          grocery_list_id?: string
          household_id?: string
          id?: string
          manual_item?: boolean
          needs_review?: boolean
          notes?: string | null
          preferred_product_id?: string | null
          preferred_quantity_text?: string | null
          quantity?: number | null
          review_reason?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_food_id_household_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "grocery_list_items_grocery_category_id_household_id_fkey"
            columns: ["grocery_category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "grocery_list_items_grocery_list_id_household_id_fkey"
            columns: ["grocery_list_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "grocery_list_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_list_items_preferred_product_id_fkey"
            columns: ["preferred_product_id"]
            isOneToOne: false
            referencedRelation: "preferred_products"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_lists: {
        Row: {
          completed_at: string | null
          created_at: string
          finalized_at: string | null
          generated_at: string | null
          household_id: string
          id: string
          name: string | null
          notes: string | null
          shopping_started_at: string | null
          status: Database["public"]["Enums"]["grocery_list_status"]
          updated_at: string
          weekly_plan_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          finalized_at?: string | null
          generated_at?: string | null
          household_id: string
          id?: string
          name?: string | null
          notes?: string | null
          shopping_started_at?: string | null
          status?: Database["public"]["Enums"]["grocery_list_status"]
          updated_at?: string
          weekly_plan_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          finalized_at?: string | null
          generated_at?: string | null
          household_id?: string
          id?: string
          name?: string | null
          notes?: string | null
          shopping_started_at?: string | null
          status?: Database["public"]["Enums"]["grocery_list_status"]
          updated_at?: string
          weekly_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_lists_weekly_plan_id_household_id_fkey"
            columns: ["weekly_plan_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      household_memberships: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_memberships_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_profiles: {
        Row: {
          archived_at: string | null
          baby_stage_override_months: number | null
          birthdate: string | null
          color_label: string | null
          created_at: string
          default_daily_calorie_target: number | null
          household_id: string
          id: string
          name: string
          notes: string | null
          off_day_calorie_target: number | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          sort_order: number
          updated_at: string
          work_day_calorie_target: number | null
        }
        Insert: {
          archived_at?: string | null
          baby_stage_override_months?: number | null
          birthdate?: string | null
          color_label?: string | null
          created_at?: string
          default_daily_calorie_target?: number | null
          household_id: string
          id?: string
          name: string
          notes?: string | null
          off_day_calorie_target?: number | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          sort_order?: number
          updated_at?: string
          work_day_calorie_target?: number | null
        }
        Update: {
          archived_at?: string | null
          baby_stage_override_months?: number | null
          birthdate?: string | null
          color_label?: string | null
          created_at?: string
          default_daily_calorie_target?: number | null
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          off_day_calorie_target?: number | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          sort_order?: number
          updated_at?: string
          work_day_calorie_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_consumption_decisions: {
        Row: {
          cooking_session_ingredient_id: string
          created_at: string
          decided_by_user_id: string | null
          household_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["pantry_consumption_decision_status"]
          updated_at: string
        }
        Insert: {
          cooking_session_ingredient_id: string
          created_at?: string
          decided_by_user_id?: string | null
          household_id: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["pantry_consumption_decision_status"]
          updated_at?: string
        }
        Update: {
          cooking_session_ingredient_id?: string
          created_at?: string
          decided_by_user_id?: string | null
          household_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["pantry_consumption_decision_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_consumption_decisions_cooking_session_ingredient_id_fkey"
            columns: ["cooking_session_ingredient_id", "household_id"]
            isOneToOne: false
            referencedRelation: "cooking_session_ingredients"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_consumption_decisions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_consumption_stock_application_allocations: {
        Row: {
          applied_quantity: number
          created_at: string
          household_id: string
          id: string
          pantry_item_id: string
          pantry_lot_revision_after: number | null
          pantry_quantity_after: number
          pantry_quantity_before: number
          pantry_updated_at_after: string | null
          stock_application_id: string
          unit: string
        }
        Insert: {
          applied_quantity: number
          created_at?: string
          household_id: string
          id?: string
          pantry_item_id: string
          pantry_lot_revision_after?: number | null
          pantry_quantity_after: number
          pantry_quantity_before: number
          pantry_updated_at_after?: string | null
          stock_application_id: string
          unit: string
        }
        Update: {
          applied_quantity?: number
          created_at?: string
          household_id?: string
          id?: string
          pantry_item_id?: string
          pantry_lot_revision_after?: number | null
          pantry_quantity_after?: number
          pantry_quantity_before?: number
          pantry_updated_at_after?: string | null
          stock_application_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_consumption_stock_appl_stock_application_id_househo_fkey"
            columns: ["stock_application_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_consumption_stock_applications"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_consumption_stock_appli_pantry_item_id_household_id_fkey"
            columns: ["pantry_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_consumption_stock_application_allocati_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_consumption_stock_application_reversal_allocations: {
        Row: {
          created_at: string
          household_id: string
          id: string
          pantry_item_id: string
          pantry_quantity_after: number
          pantry_quantity_before: number
          restored_quantity: number
          stock_application_allocation_id: string
          stock_application_reversal_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          pantry_item_id: string
          pantry_quantity_after: number
          pantry_quantity_before: number
          restored_quantity: number
          stock_application_allocation_id: string
          stock_application_reversal_id: string
          unit: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          pantry_item_id?: string
          pantry_quantity_after?: number
          pantry_quantity_before?: number
          restored_quantity?: number
          stock_application_allocation_id?: string
          stock_application_reversal_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_consumption_stock_appl_pantry_item_id_household_id_fkey1"
            columns: ["pantry_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_consumption_stock_appl_stock_application_allocation_fkey"
            columns: ["stock_application_allocation_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_consumption_stock_application_allocations"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_consumption_stock_appl_stock_application_reversal_i_fkey"
            columns: ["stock_application_reversal_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_consumption_stock_application_reversals"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_consumption_stock_application_reversa_household_id_fkey1"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_consumption_stock_application_reversals: {
        Row: {
          created_at: string
          household_id: string
          id: string
          note: string | null
          reversed_by_user_id: string | null
          stock_application_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          note?: string | null
          reversed_by_user_id?: string | null
          stock_application_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          note?: string | null
          reversed_by_user_id?: string | null
          stock_application_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_consumption_stock_app_stock_application_id_househo_fkey1"
            columns: ["stock_application_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_consumption_stock_applications"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_consumption_stock_application_reversal_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_consumption_stock_applications: {
        Row: {
          applied_by_user_id: string | null
          applied_quantity: number
          applied_unit: string
          created_at: string
          household_id: string
          id: string
          note: string | null
          pantry_consumption_decision_id: string
        }
        Insert: {
          applied_by_user_id?: string | null
          applied_quantity: number
          applied_unit: string
          created_at?: string
          household_id: string
          id?: string
          note?: string | null
          pantry_consumption_decision_id: string
        }
        Update: {
          applied_by_user_id?: string | null
          applied_quantity?: number
          applied_unit?: string
          created_at?: string
          household_id?: string
          id?: string
          note?: string | null
          pantry_consumption_decision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_consumption_stock_appl_pantry_consumption_decision__fkey"
            columns: ["pantry_consumption_decision_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_consumption_decisions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_consumption_stock_applications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_events: {
        Row: {
          after_state: Json | null
          before_state: Json | null
          created_at: string
          event_type: Database["public"]["Enums"]["pantry_event_type"]
          household_id: string
          id: string
          note: string | null
          pantry_item_id: string
        }
        Insert: {
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          event_type: Database["public"]["Enums"]["pantry_event_type"]
          household_id: string
          id?: string
          note?: string | null
          pantry_item_id: string
        }
        Update: {
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["pantry_event_type"]
          household_id?: string
          id?: string
          note?: string | null
          pantry_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_events_pantry_item_id_household_id_fkey"
            columns: ["pantry_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      pantry_intake_decisions: {
        Row: {
          created_at: string
          created_pantry_item_id: string | null
          decided_by_user_id: string | null
          grocery_list_item_id: string
          household_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["pantry_intake_decision_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_pantry_item_id?: string | null
          decided_by_user_id?: string | null
          grocery_list_item_id: string
          household_id: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["pantry_intake_decision_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_pantry_item_id?: string | null
          decided_by_user_id?: string | null
          grocery_list_item_id?: string
          household_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["pantry_intake_decision_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_intake_decisions_created_pantry_item_id_household_i_fkey"
            columns: ["created_pantry_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_intake_decisions_grocery_list_item_id_household_id_fkey"
            columns: ["grocery_list_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_list_items"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_intake_decisions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_items: {
        Row: {
          created_at: string
          discarded_at: string | null
          display_name: string
          expiration_date: string | null
          food_id: string
          grocery_category_id: string | null
          household_id: string
          id: string
          is_open: boolean
          low_stock_threshold_quantity: number | null
          low_stock_threshold_unit: string | null
          meal_profile_id: string | null
          notes: string | null
          opened_at: string | null
          package_detail: string | null
          pantry_lot_revision: number
          quantity: number | null
          quantity_note: string | null
          stock_status: Database["public"]["Enums"]["pantry_stock_status"]
          storage_location: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discarded_at?: string | null
          display_name: string
          expiration_date?: string | null
          food_id: string
          grocery_category_id?: string | null
          household_id: string
          id?: string
          is_open?: boolean
          low_stock_threshold_quantity?: number | null
          low_stock_threshold_unit?: string | null
          meal_profile_id?: string | null
          notes?: string | null
          opened_at?: string | null
          package_detail?: string | null
          pantry_lot_revision?: number
          quantity?: number | null
          quantity_note?: string | null
          stock_status?: Database["public"]["Enums"]["pantry_stock_status"]
          storage_location?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discarded_at?: string | null
          display_name?: string
          expiration_date?: string | null
          food_id?: string
          grocery_category_id?: string | null
          household_id?: string
          id?: string
          is_open?: boolean
          low_stock_threshold_quantity?: number | null
          low_stock_threshold_unit?: string | null
          meal_profile_id?: string | null
          notes?: string | null
          opened_at?: string | null
          package_detail?: string | null
          pantry_lot_revision?: number
          quantity?: number | null
          quantity_note?: string | null
          stock_status?: Database["public"]["Enums"]["pantry_stock_status"]
          storage_location?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_food_id_household_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_items_grocery_category_id_household_id_fkey"
            columns: ["grocery_category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "pantry_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_items_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      preferred_products: {
        Row: {
          created_at: string
          food_id: string | null
          household_id: string
          id: string
          is_default: boolean
          name: string
          notes: string | null
          preferred_quantity: string | null
          search_term: string | null
          store: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          food_id?: string | null
          household_id: string
          id?: string
          is_default?: boolean
          name: string
          notes?: string | null
          preferred_quantity?: string | null
          search_term?: string | null
          store?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          food_id?: string | null
          household_id?: string
          id?: string
          is_default?: boolean
          name?: string
          notes?: string | null
          preferred_quantity?: string | null
          search_term?: string | null
          store?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferred_products_food_id_household_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "preferred_products_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          display_name: string
          food_id: string | null
          grocery_category_id: string | null
          household_id: string
          id: string
          notes: string | null
          optional: boolean
          preparation: string | null
          quantity: number | null
          recipe_id: string
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          food_id?: string | null
          grocery_category_id?: string | null
          household_id: string
          id?: string
          notes?: string | null
          optional?: boolean
          preparation?: string | null
          quantity?: number | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          food_id?: string | null
          grocery_category_id?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          optional?: boolean
          preparation?: string | null
          quantity?: number | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_food_id_household_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_grocery_category_id_household_id_fkey"
            columns: ["grocery_category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_household_id_fkey"
            columns: ["recipe_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      recipe_profile_approvals: {
        Row: {
          approved_for_planning: boolean
          created_at: string
          household_id: string
          id: string
          meal_profile_id: string
          notes: string | null
          rating: Database["public"]["Enums"]["recipe_rating"] | null
          recipe_id: string
          status: Database["public"]["Enums"]["recipe_status"]
          updated_at: string
        }
        Insert: {
          approved_for_planning?: boolean
          created_at?: string
          household_id: string
          id?: string
          meal_profile_id: string
          notes?: string | null
          rating?: Database["public"]["Enums"]["recipe_rating"] | null
          recipe_id: string
          status?: Database["public"]["Enums"]["recipe_status"]
          updated_at?: string
        }
        Update: {
          approved_for_planning?: boolean
          created_at?: string
          household_id?: string
          id?: string
          meal_profile_id?: string
          notes?: string | null
          rating?: Database["public"]["Enums"]["recipe_rating"] | null
          recipe_id?: string
          status?: Database["public"]["Enums"]["recipe_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_profile_approvals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_profile_approvals_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recipe_profile_approvals_recipe_id_household_id_fkey"
            columns: ["recipe_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      recipe_reviews: {
        Row: {
          cooking_session_id: string | null
          created_at: string
          household_id: string
          id: string
          made_on: string | null
          meal_profile_id: string | null
          notes: string | null
          quick_tags: string[]
          rating: Database["public"]["Enums"]["recipe_rating"] | null
          recipe_id: string
          updated_at: string
          weekly_plan_item_id: string | null
        }
        Insert: {
          cooking_session_id?: string | null
          created_at?: string
          household_id: string
          id?: string
          made_on?: string | null
          meal_profile_id?: string | null
          notes?: string | null
          quick_tags?: string[]
          rating?: Database["public"]["Enums"]["recipe_rating"] | null
          recipe_id: string
          updated_at?: string
          weekly_plan_item_id?: string | null
        }
        Update: {
          cooking_session_id?: string | null
          created_at?: string
          household_id?: string
          id?: string
          made_on?: string | null
          meal_profile_id?: string | null
          notes?: string | null
          quick_tags?: string[]
          rating?: Database["public"]["Enums"]["recipe_rating"] | null
          recipe_id?: string
          updated_at?: string
          weekly_plan_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_reviews_cooking_session_id_household_id_fkey"
            columns: ["cooking_session_id", "household_id"]
            isOneToOne: false
            referencedRelation: "cooking_sessions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recipe_reviews_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_reviews_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recipe_reviews_recipe_id_household_id_fkey"
            columns: ["recipe_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          created_at: string
          household_id: string
          id: string
          instruction: string
          recipe_id: string
          section_label: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          instruction: string
          recipe_id: string
          section_label?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          instruction?: string
          recipe_id?: string
          section_label?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_steps_recipe_id_household_id_fkey"
            columns: ["recipe_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      recipe_tags: {
        Row: {
          created_at: string
          household_id: string
          id: string
          recipe_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          recipe_id: string
          tag: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          recipe_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tags_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tags_recipe_id_household_id_fkey"
            columns: ["recipe_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      recipes: {
        Row: {
          archived_at: string | null
          cook_minutes: number | null
          created_at: string
          description: string | null
          effort_level: string | null
          estimated_calories_per_serving: number | null
          estimated_protein_grams_per_serving: number | null
          household_id: string
          id: string
          instructions: string | null
          last_made_at: string | null
          last_planned_at: string | null
          meal_type: Database["public"]["Enums"]["meal_type"]
          name: string
          notes: string | null
          nutrition_confidence:
            | Database["public"]["Enums"]["estimate_confidence"]
            | null
          prep_minutes: number | null
          repeat_rule: Database["public"]["Enums"]["recipe_repeat_rule"] | null
          servings: number | null
          source_title: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["recipe_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cook_minutes?: number | null
          created_at?: string
          description?: string | null
          effort_level?: string | null
          estimated_calories_per_serving?: number | null
          estimated_protein_grams_per_serving?: number | null
          household_id: string
          id?: string
          instructions?: string | null
          last_made_at?: string | null
          last_planned_at?: string | null
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name: string
          notes?: string | null
          nutrition_confidence?:
            | Database["public"]["Enums"]["estimate_confidence"]
            | null
          prep_minutes?: number | null
          repeat_rule?: Database["public"]["Enums"]["recipe_repeat_rule"] | null
          servings?: number | null
          source_title?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["recipe_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cook_minutes?: number | null
          created_at?: string
          description?: string | null
          effort_level?: string | null
          estimated_calories_per_serving?: number | null
          estimated_protein_grams_per_serving?: number | null
          household_id?: string
          id?: string
          instructions?: string | null
          last_made_at?: string | null
          last_planned_at?: string | null
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name?: string
          notes?: string | null
          nutrition_confidence?:
            | Database["public"]["Enums"]["estimate_confidence"]
            | null
          prep_minutes?: number | null
          repeat_rule?: Database["public"]["Enums"]["recipe_repeat_rule"] | null
          servings?: number | null
          source_title?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["recipe_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      staples: {
        Row: {
          active: boolean
          created_at: string
          default_quantity: number | null
          default_unit: string | null
          display_name: string
          food_id: string | null
          frequency: Database["public"]["Enums"]["staple_frequency"]
          grocery_category_id: string | null
          household_id: string
          id: string
          meal_profile_id: string | null
          notes: string | null
          preferred_quantity_text: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_quantity?: number | null
          default_unit?: string | null
          display_name: string
          food_id?: string | null
          frequency?: Database["public"]["Enums"]["staple_frequency"]
          grocery_category_id?: string | null
          household_id: string
          id?: string
          meal_profile_id?: string | null
          notes?: string | null
          preferred_quantity_text?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_quantity?: number | null
          default_unit?: string | null
          display_name?: string
          food_id?: string | null
          frequency?: Database["public"]["Enums"]["staple_frequency"]
          grocery_category_id?: string | null
          household_id?: string
          id?: string
          meal_profile_id?: string | null
          notes?: string | null
          preferred_quantity_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staples_food_id_household_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "staples_grocery_category_id_household_id_fkey"
            columns: ["grocery_category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "staples_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staples_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      weekly_plan_goals: {
        Row: {
          created_at: string
          goal: Database["public"]["Enums"]["weekly_goal_type"]
          household_id: string
          id: string
          meal_profile_id: string | null
          weekly_plan_id: string
        }
        Insert: {
          created_at?: string
          goal: Database["public"]["Enums"]["weekly_goal_type"]
          household_id: string
          id?: string
          meal_profile_id?: string | null
          weekly_plan_id: string
        }
        Update: {
          created_at?: string
          goal?: Database["public"]["Enums"]["weekly_goal_type"]
          household_id?: string
          id?: string
          meal_profile_id?: string | null
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plan_goals_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "weekly_plan_goals_weekly_plan_id_household_id_fkey"
            columns: ["weekly_plan_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      weekly_plan_items: {
        Row: {
          baby_plan_slot: Database["public"]["Enums"]["baby_plan_slot"] | null
          component_type: Database["public"]["Enums"]["meal_component_type"]
          created_at: string
          display_name: string
          estimated_calories: number | null
          estimated_protein_grams: number | null
          food_id: string | null
          household_id: string
          id: string
          is_approved: boolean
          is_backup: boolean
          is_locked: boolean
          is_try_this: boolean
          meal_profile_id: string | null
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          plan_date: string
          reason_labels: string[]
          recipe_id: string | null
          scale_factor: number
          sort_order: number
          updated_at: string
          weekly_plan_id: string
          why_this: string | null
        }
        Insert: {
          baby_plan_slot?: Database["public"]["Enums"]["baby_plan_slot"] | null
          component_type?: Database["public"]["Enums"]["meal_component_type"]
          created_at?: string
          display_name: string
          estimated_calories?: number | null
          estimated_protein_grams?: number | null
          food_id?: string | null
          household_id: string
          id?: string
          is_approved?: boolean
          is_backup?: boolean
          is_locked?: boolean
          is_try_this?: boolean
          meal_profile_id?: string | null
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          plan_date: string
          reason_labels?: string[]
          recipe_id?: string | null
          scale_factor?: number
          sort_order?: number
          updated_at?: string
          weekly_plan_id: string
          why_this?: string | null
        }
        Update: {
          baby_plan_slot?: Database["public"]["Enums"]["baby_plan_slot"] | null
          component_type?: Database["public"]["Enums"]["meal_component_type"]
          created_at?: string
          display_name?: string
          estimated_calories?: number | null
          estimated_protein_grams?: number | null
          food_id?: string | null
          household_id?: string
          id?: string
          is_approved?: boolean
          is_backup?: boolean
          is_locked?: boolean
          is_try_this?: boolean
          meal_profile_id?: string | null
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          plan_date?: string
          reason_labels?: string[]
          recipe_id?: string | null
          scale_factor?: number
          sort_order?: number
          updated_at?: string
          weekly_plan_id?: string
          why_this?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_items_food_id_fkey"
            columns: ["food_id", "household_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "weekly_plan_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plan_items_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "weekly_plan_items_recipe_id_household_id_fkey"
            columns: ["recipe_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "weekly_plan_items_weekly_plan_id_household_id_fkey"
            columns: ["weekly_plan_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      weekly_plan_profile_days: {
        Row: {
          adult_day_type: Database["public"]["Enums"]["adult_day_type"] | null
          calorie_target_override: number | null
          created_at: string
          day_label: string | null
          household_id: string
          id: string
          meal_profile_id: string
          notes: string | null
          plan_date: string
          updated_at: string
          weekly_plan_id: string
        }
        Insert: {
          adult_day_type?: Database["public"]["Enums"]["adult_day_type"] | null
          calorie_target_override?: number | null
          created_at?: string
          day_label?: string | null
          household_id: string
          id?: string
          meal_profile_id: string
          notes?: string | null
          plan_date: string
          updated_at?: string
          weekly_plan_id: string
        }
        Update: {
          adult_day_type?: Database["public"]["Enums"]["adult_day_type"] | null
          calorie_target_override?: number | null
          created_at?: string
          day_label?: string | null
          household_id?: string
          id?: string
          meal_profile_id?: string
          notes?: string | null
          plan_date?: string
          updated_at?: string
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_profile_days_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plan_profile_days_meal_profile_id_household_id_fkey"
            columns: ["meal_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "meal_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "weekly_plan_profile_days_weekly_plan_id_household_id_fkey"
            columns: ["weekly_plan_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      weekly_plan_staples: {
        Row: {
          created_at: string
          household_id: string
          id: string
          staple_id: string
          updated_at: string
          weekly_plan_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          staple_id: string
          updated_at?: string
          weekly_plan_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          staple_id?: string
          updated_at?: string
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_staples_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plan_staples_staple_id_household_id_fkey"
            columns: ["staple_id", "household_id"]
            isOneToOne: false
            referencedRelation: "staples"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "weekly_plan_staples_weekly_plan_id_household_id_fkey"
            columns: ["weekly_plan_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          calorie_strictness: Database["public"]["Enums"]["calorie_strictness"]
          created_at: string
          household_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["weekly_plan_status"]
          updated_at: string
          week_start_date: string
        }
        Insert: {
          calorie_strictness?: Database["public"]["Enums"]["calorie_strictness"]
          created_at?: string
          household_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["weekly_plan_status"]
          updated_at?: string
          week_start_date: string
        }
        Update: {
          calorie_strictness?: Database["public"]["Enums"]["calorie_strictness"]
          created_at?: string
          household_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["weekly_plan_status"]
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_wrap_up_items: {
        Row: {
          created_at: string
          grocery_list_item_id: string | null
          household_id: string
          id: string
          prompt_type: string
          response: Json
          status: string
          updated_at: string
          weekly_plan_item_id: string | null
          weekly_wrap_up_id: string
        }
        Insert: {
          created_at?: string
          grocery_list_item_id?: string | null
          household_id: string
          id?: string
          prompt_type: string
          response?: Json
          status?: string
          updated_at?: string
          weekly_plan_item_id?: string | null
          weekly_wrap_up_id: string
        }
        Update: {
          created_at?: string
          grocery_list_item_id?: string | null
          household_id?: string
          id?: string
          prompt_type?: string
          response?: Json
          status?: string
          updated_at?: string
          weekly_plan_item_id?: string | null
          weekly_wrap_up_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_wrap_up_items_grocery_list_item_id_household_id_fkey"
            columns: ["grocery_list_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "grocery_list_items"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "weekly_wrap_up_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_wrap_up_items_weekly_plan_item_id_household_id_fkey"
            columns: ["weekly_plan_item_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_plan_items"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "weekly_wrap_up_items_weekly_wrap_up_id_household_id_fkey"
            columns: ["weekly_wrap_up_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_wrap_ups"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      weekly_wrap_ups: {
        Row: {
          completed_at: string | null
          created_at: string
          dismissed: boolean
          household_id: string
          id: string
          status: string
          updated_at: string
          weekly_plan_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dismissed?: boolean
          household_id: string
          id?: string
          status?: string
          updated_at?: string
          weekly_plan_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dismissed?: boolean
          household_id?: string
          id?: string
          status?: string
          updated_at?: string
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_wrap_ups_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_wrap_ups_weekly_plan_id_household_id_fkey"
            columns: ["weekly_plan_id", "household_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_pantry_consumption_stock: {
        Args: {
          p_allocations: Json
          p_applied_quantity: number
          p_applied_unit: string
          p_household_id: string
          p_note?: string
          p_pantry_consumption_decision_id: string
        }
        Returns: {
          status: string
          stock_application_id: string
        }[]
      }
      is_household_member: {
        Args: { target_household_id: string }
        Returns: boolean
      }
      replace_recipe_steps: {
        Args: { p_household_id: string; p_recipe_id: string; p_steps: Json }
        Returns: undefined
      }
      replace_weekly_plan_baby_routine_items: {
        Args: {
          p_baby_profile_id: string
          p_household_id: string
          p_items: Json
          p_weekly_plan_id: string
        }
        Returns: undefined
      }
      reverse_pantry_consumption_stock: {
        Args: {
          p_household_id: string
          p_note?: string
          p_stock_application_id: string
        }
        Returns: {
          status: string
          stock_application_id: string
          stock_application_reversal_id: string
        }[]
      }
    }
    Enums: {
      adult_day_type: "work_day" | "off_day"
      baby_food_status: "tried" | "liked" | "disliked"
      baby_plan_slot: "baby_meal_1" | "baby_meal_2"
      calorie_strictness: "strict" | "flexible" | "loose"
      cooking_session_status: "active" | "paused" | "completed" | "abandoned"
      cooking_timer_status:
        | "ready"
        | "running"
        | "paused"
        | "expired"
        | "dismissed"
        | "canceled"
      estimate_confidence: "low" | "medium" | "high"
      food_preference_level:
        | "love"
        | "like"
        | "okay"
        | "dislike"
        | "hard_no"
        | "allergy"
      grocery_list_status:
        | "draft"
        | "finalized"
        | "shopping_started"
        | "completed"
      meal_component_type:
        | "main"
        | "side"
        | "add_on"
        | "snack"
        | "drink"
        | "dessert"
        | "baby_food"
        | "sauce"
        | "topping"
        | "other"
      meal_type:
        | "breakfast"
        | "lunch"
        | "dinner"
        | "snack"
        | "drink"
        | "side"
        | "baby_meal"
        | "other"
      pantry_consumption_decision_status: "confirmed" | "skipped"
      pantry_event_type:
        | "created"
        | "adjusted"
        | "status_changed"
        | "expiration_changed"
        | "category_changed"
        | "storage_changed"
        | "notes_changed"
        | "discarded"
      pantry_intake_decision_status: "confirmed" | "skipped"
      pantry_stock_status: "in_stock" | "low" | "out" | "unknown"
      profile_type: "adult" | "baby" | "shared" | "household"
      recipe_rating: "love" | "like" | "okay" | "dislike" | "hard_no"
      recipe_repeat_rule: "weekly" | "every_two_weeks" | "monthly" | "rarely"
      recipe_status: "idea" | "tried" | "approved" | "favorite" | "retired"
      source_type:
        | "meal_generated"
        | "staple"
        | "baby_item"
        | "backup_meal"
        | "manual_add"
        | "household_item"
        | "pantry_restock"
      staple_frequency: "weekly" | "every_two_weeks" | "as_needed"
      weekly_goal_type:
        | "weight_loss"
        | "high_protein"
        | "easy_week"
        | "low_effort"
        | "use_leftovers"
        | "grill_night"
        | "family_favorites"
        | "picky_eater_safe"
        | "low_prep_work_meals"
        | "baby_variety_week"
      weekly_plan_status:
        | "draft"
        | "ready_for_grocery_review"
        | "grocery_generated"
        | "shopping_started"
        | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      adult_day_type: ["work_day", "off_day"],
      baby_food_status: ["tried", "liked", "disliked"],
      baby_plan_slot: ["baby_meal_1", "baby_meal_2"],
      calorie_strictness: ["strict", "flexible", "loose"],
      cooking_session_status: ["active", "paused", "completed", "abandoned"],
      cooking_timer_status: [
        "ready",
        "running",
        "paused",
        "expired",
        "dismissed",
        "canceled",
      ],
      estimate_confidence: ["low", "medium", "high"],
      food_preference_level: [
        "love",
        "like",
        "okay",
        "dislike",
        "hard_no",
        "allergy",
      ],
      grocery_list_status: [
        "draft",
        "finalized",
        "shopping_started",
        "completed",
      ],
      meal_component_type: [
        "main",
        "side",
        "add_on",
        "snack",
        "drink",
        "dessert",
        "baby_food",
        "sauce",
        "topping",
        "other",
      ],
      meal_type: [
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "drink",
        "side",
        "baby_meal",
        "other",
      ],
      pantry_consumption_decision_status: ["confirmed", "skipped"],
      pantry_event_type: [
        "created",
        "adjusted",
        "status_changed",
        "expiration_changed",
        "category_changed",
        "storage_changed",
        "notes_changed",
        "discarded",
      ],
      pantry_intake_decision_status: ["confirmed", "skipped"],
      pantry_stock_status: ["in_stock", "low", "out", "unknown"],
      profile_type: ["adult", "baby", "shared", "household"],
      recipe_rating: ["love", "like", "okay", "dislike", "hard_no"],
      recipe_repeat_rule: ["weekly", "every_two_weeks", "monthly", "rarely"],
      recipe_status: ["idea", "tried", "approved", "favorite", "retired"],
      source_type: [
        "meal_generated",
        "staple",
        "baby_item",
        "backup_meal",
        "manual_add",
        "household_item",
        "pantry_restock",
      ],
      staple_frequency: ["weekly", "every_two_weeks", "as_needed"],
      weekly_goal_type: [
        "weight_loss",
        "high_protein",
        "easy_week",
        "low_effort",
        "use_leftovers",
        "grill_night",
        "family_favorites",
        "picky_eater_safe",
        "low_prep_work_meals",
        "baby_variety_week",
      ],
      weekly_plan_status: [
        "draft",
        "ready_for_grocery_review",
        "grocery_generated",
        "shopping_started",
        "completed",
      ],
    },
  },
} as const
