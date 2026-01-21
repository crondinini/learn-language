import db, {
  Verb,
  VerbConjugation,
  ConjugationProgress,
  PersonInfo,
} from "./db";

// Extended verb type with conjugations
export interface VerbWithConjugations extends Verb {
  conjugations: VerbConjugationWithProgress[];
}

// Conjugation with its FSRS progress
export interface VerbConjugationWithProgress extends VerbConjugation {
  progress: ConjugationProgress | null;
}

// Verb with stats for list view
export interface VerbWithStats extends Verb {
  total_conjugations: number;
  practiced_count: number;
  mastered_count: number;
  due_count: number;
}

// Get all verbs with practice stats
export function getAllVerbs(): VerbWithStats[] {
  const verbs = db.prepare("SELECT * FROM verbs ORDER BY created_at DESC").all() as Verb[];

  return verbs.map((verb) => {
    const stats = db
      .prepare(
        `
      SELECT
        COUNT(vc.id) as total_conjugations,
        COUNT(cp.id) as practiced_count,
        SUM(CASE WHEN cp.state = 2 THEN 1 ELSE 0 END) as mastered_count,
        SUM(CASE WHEN cp.due <= datetime('now') THEN 1 ELSE 0 END) as due_count
      FROM verb_conjugations vc
      LEFT JOIN conjugation_progress cp ON vc.id = cp.verb_conjugation_id
      WHERE vc.verb_id = ? AND vc.tense = 'past'
    `
      )
      .get(verb.id) as {
      total_conjugations: number;
      practiced_count: number;
      mastered_count: number;
      due_count: number;
    };

    return {
      ...verb,
      total_conjugations: stats.total_conjugations || 0,
      practiced_count: stats.practiced_count || 0,
      mastered_count: stats.mastered_count || 0,
      due_count: stats.due_count || 0,
    };
  });
}

// Get single verb with all conjugations and progress
export function getVerbById(id: number): VerbWithConjugations | null {
  const verb = db.prepare("SELECT * FROM verbs WHERE id = ?").get(id) as Verb | undefined;
  if (!verb) return null;

  const conjugations = db
    .prepare(
      `
    SELECT
      vc.*,
      cp.id as progress_id,
      cp.stability,
      cp.difficulty,
      cp.elapsed_days,
      cp.scheduled_days,
      cp.reps,
      cp.lapses,
      cp.state,
      cp.due,
      cp.last_review
    FROM verb_conjugations vc
    LEFT JOIN conjugation_progress cp ON vc.id = cp.verb_conjugation_id
    WHERE vc.verb_id = ?
    ORDER BY vc.tense,
      CASE vc.person
        WHEN 'ana' THEN 1
        WHEN 'nahnu' THEN 2
        WHEN 'anta' THEN 3
        WHEN 'anti' THEN 4
        WHEN 'antuma' THEN 5
        WHEN 'antum' THEN 6
        WHEN 'antunna' THEN 7
        WHEN 'huwa' THEN 8
        WHEN 'hiya' THEN 9
        WHEN 'huma_m' THEN 10
        WHEN 'huma_f' THEN 11
        WHEN 'hum' THEN 12
        WHEN 'hunna' THEN 13
      END
  `
    )
    .all(id) as (VerbConjugation & Partial<ConjugationProgress> & { progress_id: number | null })[];

  const conjugationsWithProgress: VerbConjugationWithProgress[] = conjugations.map((c) => ({
    id: c.id,
    verb_id: c.verb_id,
    tense: c.tense,
    person: c.person,
    pronoun_arabic: c.pronoun_arabic,
    conjugated_form: c.conjugated_form,
    audio_url: c.audio_url,
    progress: c.progress_id
      ? {
          id: c.progress_id,
          verb_conjugation_id: c.id,
          stability: c.stability!,
          difficulty: c.difficulty!,
          elapsed_days: c.elapsed_days!,
          scheduled_days: c.scheduled_days!,
          reps: c.reps!,
          lapses: c.lapses!,
          state: c.state!,
          due: c.due!,
          last_review: c.last_review ?? null,
        }
      : null,
  }));

  return {
    ...verb,
    conjugations: conjugationsWithProgress,
  };
}

// Create a new verb with its past tense conjugations
export interface CreateVerbInput {
  root: string;
  root_transliteration?: string;
  form?: number;
  meaning: string;
  past_3ms: string;
  present_3ms: string;
  masdar?: string;
  active_participle?: string;
  passive_participle?: string;
  notes?: string;
  // Past tense conjugations (all 13 persons)
  past_conjugations: Record<string, string>;
}

export function createVerb(input: CreateVerbInput): VerbWithConjugations {
  const insertVerb = db.prepare(`
    INSERT INTO verbs (root, root_transliteration, form, meaning, past_3ms, present_3ms, masdar, active_participle, passive_participle, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertVerb.run(
    input.root,
    input.root_transliteration || null,
    input.form || 1,
    input.meaning,
    input.past_3ms,
    input.present_3ms,
    input.masdar || null,
    input.active_participle || null,
    input.passive_participle || null,
    input.notes || null
  );

  const verbId = result.lastInsertRowid as number;

  // Insert past tense conjugations
  const insertConjugation = db.prepare(`
    INSERT INTO verb_conjugations (verb_id, tense, person, pronoun_arabic, conjugated_form)
    VALUES (?, 'past', ?, ?, ?)
  `);

  for (const [person, form] of Object.entries(input.past_conjugations)) {
    const personInfo = PersonInfo[person];
    if (personInfo && form) {
      insertConjugation.run(verbId, person, personInfo.arabic, form);
    }
  }

  return getVerbById(verbId)!;
}

// Update a verb
export interface UpdateVerbInput {
  root?: string;
  root_transliteration?: string;
  form?: number;
  meaning?: string;
  past_3ms?: string;
  present_3ms?: string;
  masdar?: string;
  active_participle?: string;
  passive_participle?: string;
  notes?: string;
  past_conjugations?: Record<string, string>;
}

export function updateVerb(id: number, input: UpdateVerbInput): VerbWithConjugations | null {
  const verb = getVerbById(id);
  if (!verb) return null;

  // Update verb fields
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.root !== undefined) {
    updates.push("root = ?");
    values.push(input.root);
  }
  if (input.root_transliteration !== undefined) {
    updates.push("root_transliteration = ?");
    values.push(input.root_transliteration);
  }
  if (input.form !== undefined) {
    updates.push("form = ?");
    values.push(input.form);
  }
  if (input.meaning !== undefined) {
    updates.push("meaning = ?");
    values.push(input.meaning);
  }
  if (input.past_3ms !== undefined) {
    updates.push("past_3ms = ?");
    values.push(input.past_3ms);
  }
  if (input.present_3ms !== undefined) {
    updates.push("present_3ms = ?");
    values.push(input.present_3ms);
  }
  if (input.masdar !== undefined) {
    updates.push("masdar = ?");
    values.push(input.masdar);
  }
  if (input.active_participle !== undefined) {
    updates.push("active_participle = ?");
    values.push(input.active_participle);
  }
  if (input.passive_participle !== undefined) {
    updates.push("passive_participle = ?");
    values.push(input.passive_participle);
  }
  if (input.notes !== undefined) {
    updates.push("notes = ?");
    values.push(input.notes);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE verbs SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  // Update conjugations if provided
  if (input.past_conjugations) {
    const upsertConjugation = db.prepare(`
      INSERT INTO verb_conjugations (verb_id, tense, person, pronoun_arabic, conjugated_form)
      VALUES (?, 'past', ?, ?, ?)
      ON CONFLICT(verb_id, tense, person) DO UPDATE SET conjugated_form = excluded.conjugated_form
    `);

    for (const [person, form] of Object.entries(input.past_conjugations)) {
      const personInfo = PersonInfo[person];
      if (personInfo && form) {
        upsertConjugation.run(id, person, personInfo.arabic, form);
      }
    }
  }

  return getVerbById(id);
}

// Delete a verb
export function deleteVerb(id: number): boolean {
  const result = db.prepare("DELETE FROM verbs WHERE id = ?").run(id);
  return result.changes > 0;
}

// Get due conjugations for review
export interface DueConjugation {
  conjugation_id: number;
  progress_id: number;
  verb_id: number;
  root: string;
  meaning: string;
  past_3ms: string;
  tense: string;
  person: string;
  pronoun_arabic: string;
  conjugated_form: string;
  // FSRS fields
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  due: string;
  last_review: string | null;
}

export function getDueConjugations(limit: number = 20): DueConjugation[] {
  return db
    .prepare(
      `
    SELECT
      vc.id as conjugation_id,
      cp.id as progress_id,
      v.id as verb_id,
      v.root,
      v.meaning,
      v.past_3ms,
      vc.tense,
      vc.person,
      vc.pronoun_arabic,
      vc.conjugated_form,
      cp.stability,
      cp.difficulty,
      cp.elapsed_days,
      cp.scheduled_days,
      cp.reps,
      cp.lapses,
      cp.state,
      cp.due,
      cp.last_review
    FROM conjugation_progress cp
    JOIN verb_conjugations vc ON cp.verb_conjugation_id = vc.id
    JOIN verbs v ON vc.verb_id = v.id
    WHERE cp.due <= datetime('now')
    ORDER BY cp.due ASC
    LIMIT ?
  `
    )
    .all(limit) as DueConjugation[];
}

// Get new conjugations (not yet practiced)
export function getNewConjugations(verbId?: number, limit: number = 20): DueConjugation[] {
  const query = verbId
    ? `
    SELECT
      vc.id as conjugation_id,
      NULL as progress_id,
      v.id as verb_id,
      v.root,
      v.meaning,
      v.past_3ms,
      vc.tense,
      vc.person,
      vc.pronoun_arabic,
      vc.conjugated_form,
      0 as stability,
      0 as difficulty,
      0 as elapsed_days,
      0 as scheduled_days,
      0 as reps,
      0 as lapses,
      0 as state,
      datetime('now') as due,
      NULL as last_review
    FROM verb_conjugations vc
    JOIN verbs v ON vc.verb_id = v.id
    LEFT JOIN conjugation_progress cp ON vc.id = cp.verb_conjugation_id
    WHERE cp.id IS NULL AND vc.verb_id = ? AND vc.tense = 'past'
    ORDER BY RANDOM()
    LIMIT ?
  `
    : `
    SELECT
      vc.id as conjugation_id,
      NULL as progress_id,
      v.id as verb_id,
      v.root,
      v.meaning,
      v.past_3ms,
      vc.tense,
      vc.person,
      vc.pronoun_arabic,
      vc.conjugated_form,
      0 as stability,
      0 as difficulty,
      0 as elapsed_days,
      0 as scheduled_days,
      0 as reps,
      0 as lapses,
      0 as state,
      datetime('now') as due,
      NULL as last_review
    FROM verb_conjugations vc
    JOIN verbs v ON vc.verb_id = v.id
    LEFT JOIN conjugation_progress cp ON vc.id = cp.verb_conjugation_id
    WHERE cp.id IS NULL AND vc.tense = 'past'
    ORDER BY RANDOM()
    LIMIT ?
  `;

  return verbId
    ? (db.prepare(query).all(verbId, limit) as DueConjugation[])
    : (db.prepare(query).all(limit) as DueConjugation[]);
}

// Start practicing a conjugation (create progress record)
export function startPracticing(conjugationId: number): ConjugationProgress {
  // Check if already exists
  const existing = db
    .prepare("SELECT * FROM conjugation_progress WHERE verb_conjugation_id = ?")
    .get(conjugationId) as ConjugationProgress | undefined;

  if (existing) return existing;

  const result = db
    .prepare(
      `
    INSERT INTO conjugation_progress (verb_conjugation_id)
    VALUES (?)
  `
    )
    .run(conjugationId);

  return db
    .prepare("SELECT * FROM conjugation_progress WHERE id = ?")
    .get(result.lastInsertRowid) as ConjugationProgress;
}

// Update conjugation progress after review
export function updateConjugationProgress(
  progressId: number,
  updates: Partial<ConjugationProgress>
): ConjugationProgress | null {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.stability !== undefined) {
    fields.push("stability = ?");
    values.push(updates.stability);
  }
  if (updates.difficulty !== undefined) {
    fields.push("difficulty = ?");
    values.push(updates.difficulty);
  }
  if (updates.elapsed_days !== undefined) {
    fields.push("elapsed_days = ?");
    values.push(updates.elapsed_days);
  }
  if (updates.scheduled_days !== undefined) {
    fields.push("scheduled_days = ?");
    values.push(updates.scheduled_days);
  }
  if (updates.reps !== undefined) {
    fields.push("reps = ?");
    values.push(updates.reps);
  }
  if (updates.lapses !== undefined) {
    fields.push("lapses = ?");
    values.push(updates.lapses);
  }
  if (updates.state !== undefined) {
    fields.push("state = ?");
    values.push(updates.state);
  }
  if (updates.due !== undefined) {
    fields.push("due = ?");
    values.push(updates.due);
  }
  if (updates.last_review !== undefined) {
    fields.push("last_review = ?");
    values.push(updates.last_review);
  }

  if (fields.length === 0) return null;

  values.push(progressId);
  db.prepare(`UPDATE conjugation_progress SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return db.prepare("SELECT * FROM conjugation_progress WHERE id = ?").get(progressId) as ConjugationProgress;
}

// Log conjugation review
export function logConjugationReview(
  progressId: number,
  rating: number,
  elapsedDays: number,
  scheduledDays: number,
  state: number
): void {
  db.prepare(
    `
    INSERT INTO conjugation_reviews (conjugation_progress_id, rating, elapsed_days, scheduled_days, state)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(progressId, rating, elapsedDays, scheduledDays, state);
}
