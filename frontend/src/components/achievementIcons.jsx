import {
  Footprints, Clock, Flame, Medal, Sparkles, Star, Crown, Trophy, Award, Heart, Music, Zap, Target, Gem, Rocket, CalendarCheck,
} from 'lucide-react';

/** Icons available for achievements (keys match the API's icon list) */
export const ACHIEVEMENT_ICONS = {
  footprints: Footprints, clock: Clock, flame: Flame, medal: Medal, sparkles: Sparkles, star: Star, crown: Crown,
  trophy: Trophy, award: Award, heart: Heart, music: Music, zap: Zap, target: Target, gem: Gem, rocket: Rocket,
  'calendar-check': CalendarCheck,
};

export const AchievementIcon = ({ name, size = 22 }) => {
  const Icon = ACHIEVEMENT_ICONS[name] || Star;
  return <Icon size={size} />;
};
