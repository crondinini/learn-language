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
      return "Replenish and comfort";
    case "Follicular":
      return "Fuel the rebuild with fresh, vibrant foods";
    case "Ovulation":
      return "Light, clean, and antioxidant-rich";
    case "Luteal":
      return "Satisfy cravings wisely and support your mood";
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
        { icon: "🥬", name: "Iron-rich foods", description: "Spinach, lentils, red meat — replenish what you lose", detail: "Essential" },
        { icon: "🍲", name: "Warm soups", description: "Bone broth or veggie soup — warming and anti-inflammatory", detail: "Comfort" },
        { icon: "🍫", name: "Dark chocolate", description: "70%+ cacao — magnesium to ease cramps and lift mood", detail: "Treat" },
        { icon: "💧", name: "Hydration", description: "Herbal teas, warm water with lemon — reduce bloating", detail: "2L+ daily" },
      ];
    case "Follicular":
      return [
        { icon: "🥗", name: "Fresh salads", description: "Leafy greens, sprouts, and light vinaigrettes", detail: "Daily" },
        { icon: "🥚", name: "Lean protein", description: "Chicken, fish, tofu — support muscle recovery", detail: "Each meal" },
        { icon: "🫙", name: "Fermented foods", description: "Yogurt, kimchi, sauerkraut — boost gut health", detail: "1-2 servings" },
        { icon: "🌾", name: "Complex carbs", description: "Oats, quinoa, sweet potatoes — sustained energy", detail: "Fuel up" },
      ];
    case "Ovulation":
      return [
        { icon: "🥕", name: "Raw vegetables", description: "Crunchy salads, veggie sticks — light and energizing", detail: "Daily" },
        { icon: "🍓", name: "Antioxidant fruits", description: "Berries, pomegranate, citrus — support cell health", detail: "2-3 servings" },
        { icon: "🍽️", name: "Light meals", description: "Smaller, frequent meals — keep energy steady", detail: "Grazing" },
        { icon: "🌱", name: "Fiber-rich foods", description: "Flaxseeds, beans, whole grains — support estrogen balance", detail: "Important" },
      ];
    case "Luteal":
      return [
        { icon: "🍫", name: "Magnesium-rich foods", description: "Dark chocolate, nuts, bananas — ease PMS symptoms", detail: "Key mineral" },
        { icon: "🌾", name: "Complex carbs", description: "Brown rice, oats — stabilize serotonin and mood", detail: "Each meal" },
        { icon: "🐟", name: "Omega-3s", description: "Salmon, walnuts, chia seeds — reduce inflammation", detail: "2-3x/week" },
        { icon: "🍲", name: "Comfort foods", description: "Warm stews and roasted veggies — nourish without overdoing", detail: "In moderation" },
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
