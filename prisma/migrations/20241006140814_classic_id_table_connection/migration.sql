-- DropForeignKey
ALTER TABLE "AssistantRequest" DROP CONSTRAINT "AssistantRequest_assistantId_fkey";

-- DropForeignKey
ALTER TABLE "AssistantRequest" DROP CONSTRAINT "AssistantRequest_userId_fkey";

-- AddForeignKey
ALTER TABLE "AssistantRequest" ADD CONSTRAINT "AssistantRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantRequest" ADD CONSTRAINT "AssistantRequest_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
