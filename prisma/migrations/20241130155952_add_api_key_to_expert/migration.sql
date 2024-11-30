-- CreateTable
CREATE TABLE "experts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "api_key" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL,
    "presence_penalty" DOUBLE PRECISION NOT NULL,
    "frequency_penalty" DOUBLE PRECISION NOT NULL,
    "top_p" DOUBLE PRECISION NOT NULL,
    "capabilities" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL,
    "problem_resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_provider_key" ON "api_keys"("provider");
