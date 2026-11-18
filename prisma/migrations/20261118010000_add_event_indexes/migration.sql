-- CreateIndex
CREATE INDEX "Event_isPublished_rejectedAt_startAt_idx" ON "Event"("isPublished", "rejectedAt", "startAt");

-- CreateIndex
CREATE INDEX "Event_source_reviewedAt_rejectedAt_idx" ON "Event"("source", "reviewedAt", "rejectedAt");

-- CreateIndex
CREATE INDEX "Event_updatedAt_idx" ON "Event"("updatedAt");
