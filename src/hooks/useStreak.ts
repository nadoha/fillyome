import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useStreak = () => {
  const [streak, setStreak] = useState(0);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get all learning sessions ordered by date
      const { data: sessions, error } = await supabase
        .from("learning_sessions")
        .select("session_date")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false });

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        setStreak(0);
        setTodayCompleted(false);
        setIsLoading(false);
        return;
      }

      // Calculate streak
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      let currentStreak = 0;
      let checkDate = today;
      const sessionDates = new Set(sessions.map(s => s.session_date));

      // Check if today is completed
      const isTodayCompleted = sessionDates.has(today);
      setTodayCompleted(isTodayCompleted);

      // If today is not completed, start checking from yesterday
      if (!isTodayCompleted) {
        if (!sessionDates.has(yesterday)) {
          // No session yesterday, streak is 0
          setStreak(0);
          setIsLoading(false);
          return;
        }
        checkDate = yesterday;
      }

      // Count consecutive days
      while (sessionDates.has(checkDate)) {
        currentStreak++;
        const prevDate = new Date(checkDate);
        prevDate.setDate(prevDate.getDate() - 1);
        checkDate = prevDate.toISOString().split("T")[0];
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error("Failed to load streak:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStreak = () => {
    loadStreak();
  };

  return { streak, todayCompleted, isLoading, refreshStreak };
};
