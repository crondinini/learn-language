import type { CyclePhase } from "./types";

interface FitItem {
  icon: string;
  name: string;
  description: string;
  detail: string;
}

export function getExerciseSubtitle(phase: CyclePhase): string {
  switch (phase) {
    case "Period":
      return "Go gentle — your body is doing a lot right now";
    case "Follicular":
      return "Energy is rising — time to challenge yourself";
    case "Ovulation":
      return "Peak energy — go all out";
    case "Luteal":
      return "Wind down — focus on recovery and balance";
  }
}

export function getNutritionSubtitle(phase: CyclePhase): string {
  switch (phase) {
    case "Period":
      return "Replenish iron and keep energy stable";
    case "Follicular":
      return "Fuel the rebuild — your body uses carbs efficiently now";
    case "Ovulation":
      return "Light, clean, and anti-inflammatory";
    case "Luteal":
      return "Your metabolism is higher — eat accordingly";
  }
}

export interface NutritionCallout {
  text: string;
  icon: string;
}

export function getNutritionCallout(phase: CyclePhase): NutritionCallout | null {
  switch (phase) {
    case "Period":
      return {
        icon: "🩸",
        text: "Focus on iron-rich foods (red meat, spinach, lentils). You're losing iron — replenish it. Dark chocolate (70%+) has magnesium that helps with cramps.",
      };
    case "Follicular":
      return null;
    case "Ovulation":
      return null;
    case "Luteal":
      return {
        icon: "⚖️",
        text: "Skip the scale days 17-28. Water retention makes the number meaningless — it's not fat gain, it's biology. You'll see your real weight after your period starts.",
      };
  }
}

export function getExercises(phase: CyclePhase): FitItem[] {
  switch (phase) {
    case "Period":
      return [
        { icon: "🧘", name: "Gentle yoga", description: "Slow flows and hip openers to ease cramps", detail: "20 min" },
        { icon: "🚶", name: "Light walking", description: "Easy pace outdoors to boost mood gently", detail: "20-30 min" },
        { icon: "🤸", name: "Stretching", description: "Full-body stretch focusing on lower back and hips", detail: "15 min" },
        { icon: "🌿", name: "Restorative poses", description: "Supported child's pose, legs up the wall", detail: "15-20 min" },
      ];
    case "Follicular":
      return [
        { icon: "🏃", name: "Cardio", description: "Running, cycling, or dance — energy is building", detail: "30-40 min" },
        { icon: "⚡", name: "HIIT", description: "High-intensity intervals to match rising energy", detail: "20-25 min" },
        { icon: "💃", name: "Dance workout", description: "Fun, expressive movement to celebrate the boost", detail: "30 min" },
        { icon: "🏋️", name: "Strength training", description: "Progressive overload — your body recovers faster now", detail: "40 min" },
      ];
    case "Ovulation":
      return [
        { icon: "⚡", name: "High-intensity training", description: "Push your limits — strength and endurance peak now", detail: "30-45 min" },
        { icon: "👥", name: "Group classes", description: "Social energy is high — try a spin or boxing class", detail: "45 min" },
        { icon: "🏃", name: "Running", description: "Longer distances or tempo runs feel great now", detail: "30-40 min" },
        { icon: "🧘", name: "Power yoga", description: "Strong vinyasa flow with arm balances", detail: "40 min" },
      ];
    case "Luteal":
      return [
        { icon: "🤸", name: "Pilates", description: "Controlled movements to stay active without overdoing it", detail: "30 min" },
        { icon: "🏋️", name: "Moderate strength", description: "Lighter weights, higher reps — maintain don't push", detail: "30 min" },
        { icon: "🏊", name: "Swimming", description: "Low-impact and soothing — great for bloating relief", detail: "30 min" },
        { icon: "🚶", name: "Long walks", description: "Steady pace to move without stressing the body", detail: "30-45 min" },
      ];
  }
}

export function getNutrition(phase: CyclePhase): FitItem[] {
  switch (phase) {
    case "Period":
      return [
        { icon: "🥩", name: "Prioritise iron", description: "Red meat, spinach, lentils — you're losing iron, replenish it actively", detail: "Every meal" },
        { icon: "🍫", name: "Magnesium for cramps", description: "Dark chocolate 70%+, nuts, bananas — eases cramps and lifts mood", detail: "Daily" },
        { icon: "💧", name: "Extra hydration", description: "Herbal teas, warm water with lemon — helps with bloating", detail: "2L+" },
        { icon: "🍽️", name: "Eat normally", description: "No need to cut calories. Your body is working hard — fuel it", detail: "Maintain" },
      ];
    case "Follicular":
      return [
        { icon: "🥚", name: "Protein with every meal", description: "Chicken, fish, eggs, tofu — supports the muscle you're building in the gym", detail: "1 palm/meal" },
        { icon: "🌾", name: "Carbs are your friend", description: "Your body accesses stored carbs efficiently now — oats, rice, potatoes", detail: "Fuel up" },
        { icon: "🫙", name: "Fermented foods", description: "Yogurt, kimchi, sauerkraut — estrogen is rising, support gut health", detail: "1-2/day" },
        { icon: "🥗", name: "Fresh and light", description: "You'll naturally crave lighter meals — lean into it", detail: "Daily" },
      ];
    case "Ovulation":
      return [
        { icon: "🥕", name: "Anti-inflammatory foods", description: "Leafy greens, berries, turmeric — support your body at peak output", detail: "Daily" },
        { icon: "🌱", name: "Fibre for estrogen", description: "Flaxseeds, beans, whole grains — helps clear excess estrogen", detail: "Important" },
        { icon: "🍽️", name: "Smaller, frequent meals", description: "Energy is high but appetite may dip — graze to stay fuelled", detail: "4-5 meals" },
        { icon: "🐟", name: "Omega-3s", description: "Salmon, walnuts, chia — anti-inflammatory support for joints", detail: "2-3x/week" },
      ];
    case "Luteal":
      return [
        { icon: "🍚", name: "+1 cupped hand of carbs", description: "Your metabolism increases 5-10%. The hunger is biological, not lack of discipline. Add an extra portion of carbs per day", detail: "Extra/day" },
        { icon: "🌾", name: "Complex carbs for mood", description: "Brown rice, oats, sweet potatoes — stabilise serotonin. Mood dips are real, carbs help", detail: "Each meal" },
        { icon: "🍫", name: "Magnesium-rich snacks", description: "Dark chocolate, nuts, bananas — ease PMS and satisfy cravings smartly", detail: "Daily" },
        { icon: "🐟", name: "Omega-3s", description: "Salmon, walnuts, chia seeds — reduce inflammation and bloating", detail: "2-3x/week" },
      ];
  }
}

export function getPartnerPhaseDetails(phase: CyclePhase) {
  switch (phase) {
    case "Period":
      return {
        forecast: "may feel lower energy, cramps, and need extra rest. Comfort and warmth go a long way right now.",
        tips: [
          { icon: "🛁", title: "Create calm spaces", desc: "Warmth and softness help. Run a bath, light a candle, lower the lights." },
          { icon: "🍫", title: "Keep snacks close", desc: "Cravings peak now. Chocolate, carbs, and warm meals will be appreciated." },
          { icon: "🤍", title: "Be gentle", desc: "Energy is low. Offer help without being asked, and keep plans light." },
        ],
      };
    case "Follicular":
      return {
        forecast: "is in her follicular phase — energy is rising, mood is lifting. Great time for new plans and adventures together.",
        tips: [
          { icon: "🌱", title: "Plan something fun", desc: "Energy and optimism are building. Try a new restaurant or activity together." },
          { icon: "💬", title: "Have those big talks", desc: "Communication flows easier now. Good time for planning and decisions." },
          { icon: "🏃‍♀️", title: "Be active together", desc: "She'll have more stamina. Suggest a walk, workout, or outdoor time." },
        ],
      };
    case "Ovulation":
      return {
        forecast: "is near ovulation — confidence and social energy are at their peak. She'll feel most outgoing and connected.",
        tips: [
          { icon: "✨", title: "Enjoy the glow", desc: "Energy and mood are highest. Make the most of this window together." },
          { icon: "🎉", title: "Social plans welcome", desc: "She'll enjoy seeing friends, going out, and being spontaneous." },
          { icon: "💕", title: "Connection time", desc: "Emotional and physical closeness feel most natural right now." },
        ],
      };
    case "Luteal":
      return {
        forecast: "is in her luteal phase — expect heightened emotions and a deeper need for comfort. Not the best time for big conversations.",
        tips: [
          { icon: "🛁", title: "Create calm spaces", desc: "She'll gravitate toward warmth and softness. Lower the lights, keep it cozy." },
          { icon: "🍫", title: "Keep snacks close", desc: "Cravings are picking up. Chocolate and warm meals will be appreciated." },
          { icon: "🤍", title: "Affirm and reassure", desc: "She may doubt herself more. A simple \"you're doing great\" goes far." },
          { icon: "📵", title: "Less stimulation", desc: "Reduce social plans if you can. She'll recharge best in low-key environments." },
        ],
      };
  }
}
