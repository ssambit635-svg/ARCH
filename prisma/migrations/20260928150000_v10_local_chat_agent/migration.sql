-- V10 — optional feedback on chat answers. Ratings are for product evaluation only; they are
-- not added to the native incident-training set or used to fine-tune the local language model.
CREATE TYPE "ArchChatFeedbackRating" AS ENUM ('UP', 'DOWN');

ALTER TABLE "arch_chat_messages"
  ADD COLUMN "feedbackRating" "ArchChatFeedbackRating";
