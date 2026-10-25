import { eq } from "drizzle-orm";
import { connect } from "./client.js";
import * as t from "./schema.js";
import { seedContents, seedSources } from "./seed-data.js";
import { draftSchema, type Content } from "@uh/contracts";
import { parseMarkdown } from "../markdown.js";
import { hashPassword } from "../auth.js";
import { defaultHomeSections } from "@uh/domain";
import { defaultInsuranceRecords } from "./insurance-policy.js";
import { defaultTrainingRecord } from "./training-catalog.js";
import { defaultBenefitPolicy } from "./benefit-policy.js";
const { DATABASE_URL, ADMIN_USERNAME = "admin", ADMIN_PASSWORD } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (ADMIN_PASSWORD && ADMIN_PASSWORD.length < 16)
  throw new Error("Admin password must contain at least 16 characters when configured");
const { db, client } = connect(DATABASE_URL);
try {
  await db.transaction(async (tx) => {
    await tx
      .insert(t.config)
      .values([
        { key: "insurancePolicies", value: defaultInsuranceRecords },
        { key: "trainingCatalog:310000", value: defaultTrainingRecord },
        { key: "homeSections", value: defaultHomeSections },
        { key: "benefitPolicy:310000", value: defaultBenefitPolicy },
      ])
      .onConflictDoNothing();
    if (ADMIN_PASSWORD) await tx
      .insert(t.admins)
      .values({
        username: ADMIN_USERNAME,
        passwordHash: hashPassword(ADMIN_PASSWORD),
        role: "admin",
      })
      .onConflictDoNothing();
    for (const source of seedSources)
      await tx
        .insert(t.sources)
        .values({ id: source.id, data: source })
        .onConflictDoNothing();
    for (const item of seedContents) {
      if (
        (
          await tx
            .select({ id: t.contents.id })
            .from(t.contents)
            .where(eq(t.contents.id, item.id))
        ).length
      )
        continue;
      const draft = draftSchema.parse(item.draft);
      const now = new Date().toISOString();
      const snapshot: Content = {
        ...draft,
        id: item.id,
        revision: 1,
        status: "published",
        verificationState: "verified",
        publishedAt: now,
        verifiedAt: now,
        body: parseMarkdown(draft.markdown),
      };
      await tx
        .insert(t.contents)
        .values({ id: item.id, draft, state: "published", currentRevision: 1 });
      await tx
        .insert(t.revisions)
        .values({ contentId: item.id, revision: 1, snapshot });
      await tx.insert(t.audit).values({
        id: crypto.randomUUID(),
        actor: ADMIN_PASSWORD ? ADMIN_USERNAME : "system",
        action: "seed_verified_content",
        entityId: item.id,
      });
    }
  });
  console.log("Seed complete (existing content/accounts preserved)");
} finally {
  await client.end();
}
