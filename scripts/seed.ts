/** Creates a demo host at /demo with a few event types. Safe to re-run. */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { bookingQuestions, eventTypes, users } from "../src/db/schema";
import { createHostDefaults } from "../src/lib/defaults";

async function main() {
  const [existing] = await db.select().from(users).where(eq(users.username, "demo")).limit(1);
  if (existing) {
    console.log("Demo host already exists: /demo");
    process.exit(0);
  }

  const [host] = await db
    .insert(users)
    .values({
      email: "demo@example.com",
      name: "Asha Mehta",
      username: "demo",
      timezone: "Asia/Kolkata",
      bio: "Brand strategist helping D2C founders find their voice. Pick a slot below.",
      brandColor: "#0f766e",
    })
    .returning();

  await createHostDefaults(db, host.id, host.timezone);

  const [discovery] = await db
    .insert(eventTypes)
    .values({
      userId: host.id,
      slug: "discovery",
      title: "Discovery Call",
      description: "A quick call to understand your brand and see if we're a fit.",
      durationMin: 20,
      location: { type: "google_meet" },
      bufferAfterMin: 10,
      minNoticeMin: 120,
    })
    .returning();

  await db.insert(bookingQuestions).values([
    { eventTypeId: discovery.id, label: "Company / brand name", type: "text", required: true, position: 0 },
    { eventTypeId: discovery.id, label: "WhatsApp number", type: "phone", required: false, position: 1 },
    {
      eventTypeId: discovery.id,
      label: "What do you need help with?",
      type: "select",
      required: true,
      options: ["Brand identity", "Website", "Social media", "Not sure yet"],
      position: 2,
    },
  ]);

  await db.insert(eventTypes).values({
    userId: host.id,
    slug: "strategy-session",
    title: "60-min Strategy Session",
    description: "Deep-dive working session. Come with your questions.",
    durationMin: 60,
    location: { type: "zoom", value: "https://zoom.us/j/1234567890" },
    bufferBeforeMin: 15,
    bufferAfterMin: 15,
    dailyCap: 2,
  });

  console.log("Seeded demo host: http://localhost:3000/demo");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
