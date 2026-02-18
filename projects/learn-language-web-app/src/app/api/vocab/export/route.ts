import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import AnkiExport from "anki-apkg-export";
import db, { Card, CardState } from "@/lib/db";

interface ExportCard extends Card {
  deck_name: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get("filter");
  const search = searchParams.get("search");
  const deckId = searchParams.get("deckId");

  // Build query using same logic as vocab route
  let query = `
    SELECT cards.*, decks.name as deck_name
    FROM cards
    JOIN decks ON cards.deck_id = decks.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (deckId) {
    query += " AND cards.deck_id = ?";
    params.push(parseInt(deckId));
  }

  if (filter === "new") {
    query += " AND cards.state = ?";
    params.push(CardState.New);
  } else if (filter === "learning") {
    query += " AND cards.state IN (?, ?)";
    params.push(CardState.Learning, CardState.Relearning);
  } else if (filter === "mastered") {
    query += " AND cards.state = ?";
    params.push(CardState.Review);
  } else if (filter === "week") {
    query += " AND cards.state = ? AND cards.last_review >= datetime('now', '-7 days')";
    params.push(CardState.Review);
  }

  if (search) {
    query += " AND (cards.front LIKE ? OR cards.back LIKE ? OR cards.notes LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += " ORDER BY cards.last_review DESC NULLS LAST, cards.created_at DESC";

  const cards = db.prepare(query).all(...params) as ExportCard[];

  if (cards.length === 0) {
    return new Response(JSON.stringify({ error: "No cards to export" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build deck name based on filter context
  let deckName = "Arabic Vocabulary";
  if (deckId) {
    const deckNames = [...new Set(cards.map((c) => c.deck_name))];
    deckName = deckNames.join(" + ");
  } else if (filter) {
    const filterLabels: Record<string, string> = {
      new: "Not Learned",
      learning: "Learning",
      mastered: "Mastered",
      week: "This Week",
    };
    deckName = `Arabic Vocabulary - ${filterLabels[filter] || filter}`;
  }

  const apkg = AnkiExport(deckName, {
    css: `.card {
  font-family: "Noto Sans Arabic", "Geeza Pro", arial;
  font-size: 24px;
  text-align: center;
  color: black;
  background-color: white;
}
.arabic { font-size: 36px; direction: rtl; margin-bottom: 12px; }
.english { font-size: 20px; }
.notes { font-size: 16px; color: #666; margin-top: 12px; font-style: italic; }
img { max-width: 300px; max-height: 200px; margin-top: 12px; }`,
  });

  const publicDir = path.join(process.cwd(), "public");

  // Add media and build cards
  for (const card of cards) {
    let front = `<div class="arabic">${card.front}</div>`;
    let back = `<div class="english">${card.back}</div>`;

    // Add audio to front
    if (card.audio_url) {
      const audioPath = path.join(publicDir, card.audio_url);
      const filename = `card-${card.id}${path.extname(card.audio_url)}`;
      try {
        const audioData = fs.readFileSync(audioPath);
        apkg.addMedia(filename, audioData);
        front += `[sound:${filename}]`;
      } catch {
        // Skip if audio file not found
      }
    }

    // Add notes to back
    if (card.notes) {
      back += `<div class="notes">${card.notes}</div>`;
    }

    // Add image to back
    if (card.image_url) {
      const imagePath = path.join(publicDir, card.image_url);
      const filename = `card-${card.id}${path.extname(card.image_url)}`;
      try {
        const imageData = fs.readFileSync(imagePath);
        apkg.addMedia(filename, imageData);
        back += `<img src="${filename}" />`;
      } catch {
        // Skip if image file not found
      }
    }

    apkg.addCard(front, back);
  }

  const zip = await apkg.save();

  const safeFilename = deckName.replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, "-");

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeFilename}.apkg"`,
    },
  });
}
