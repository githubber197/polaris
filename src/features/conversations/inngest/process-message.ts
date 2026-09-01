import { createAgent, gemini, createNetwork, openai } from "@inngest/agent-kit";
import { inngest } from "@/inngest/client";
import { Id } from "../../../../convex/_generated/dataModel";
import { NonRetriableError } from "inngest";
import { api } from "../../../../convex/_generated/api";
import { convex } from "@/lib/convex-client";
import { CODING_AGENT_SYSTEM_PROMPT } from "./constants";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import { TITLE_GENERATOR_SYSTEM_PROMPT } from "./constants";
import { createReadFilesTool } from "./tools/read-files";
import { createListFilesTool } from "./tools/list-files";
import { createUpdateFileTool } from "./tools/update-file";
import { createCreateFilesTool } from "./tools/create-files";
import { createCreateFolderTool } from "./tools/create-folder";
import { createRenameFileTool } from "./tools/rename-file";
import { createDeleteFilesTool } from "./tools/delete-files";
import { createScrapeUrlsTool } from "./tools/scrape-urls";

interface MessageEvent {
    messageId: Id<"messages">;
    conversationId: Id<"conversations">;
    projectId: Id<"projects">;
    message: string;
};

export const processMessage = inngest.createFunction(
    {
        id: "process-message",
        cancelOn: [
            {
                event: "message/cancel",
                if: "event.data.messageId == async.data.messageId",
            }
        ],
        onFailure: async ({ event, step }) => {
            const { messageId } = event.data.event.data as MessageEvent;
            const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

            if (internalKey) {
                await step.run("update-message-on-failure", async () => {
                    await convex.mutation(api.system.updateMessageContent, {
                        internalKey,
                        messageId,
                        content: 
                            "My apologies, I encountered an error while processing your query request. Let me know if you need anything else!",
                    }); 
                });
            }
        }
    },
    {
        event: "message/sent",
    },
    async ({ event, step }) => {
        const { 
            messageId ,
            conversationId,
            projectId,
            message
        } = event.data as MessageEvent;

        const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

        if (!internalKey) {
            throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured");
        }

        //Check if this is needed to be processed by AI or not
        await step.sleep("wait-for-dv-sync", "1s");

        //Get conversation for title generation check
        const conversation = await step.run("get-conversation", async () => {
            return await convex.query(api.system.getConversationById, {
                internalKey,
                conversationId
            });
        });

        if (!conversation) {
            throw new NonRetriableError(`Conversation with id ${conversationId} not found`);
        }

        //Fetch recent messages for context
        const recentMessages = await step.run("get-recent-messages", async () => {
            return await convex.query(api.system.getRecentMessages, {
                internalKey,
                conversationId,
                limit: 10
            });
        });

        //Build system prompt with conversation history (exclude the current message)
        let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;

        // Filter out the current message from recent messages
        const contextMessages = recentMessages.filter((msg) => msg._id !== messageId && msg.content.trim() !== "");

        if (contextMessages.length > 0) {
            const historyText = contextMessages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n");

            systemPrompt += `\n\n## Previous Conversation (for context only - do NOT repeat these responses):\n${historyText}\n\n## Current Request:\nRespond ONLY to the user's new message below. Do not repeat or reference your previous responses.`;
        }

        //Generate conversation title if not present
        const shouldGenerateTitle = conversation.title === DEFAULT_CONVERSATION_TITLE;

        if (shouldGenerateTitle) {
            const titleAgent = createAgent({
                name: "title-generator",
                system: TITLE_GENERATOR_SYSTEM_PROMPT,
                model: openai({
                    model: "openai/gpt-oss-120b",
                    apiKey: process.env.GROK_GENERATIVE_AI_API_KEY,
                     baseUrl: "https://api.groq.com/openai/v1",
                }),
            });

            const { output } = await titleAgent.run( message, { step } );

            const textMessage = output.find((msg) => msg.type === "text" && msg.role === "assistant");

            if (textMessage?.type === "text") {
                const title = 
                    typeof textMessage.content === "string" 
                        ? textMessage.content.trim()
                        : textMessage.content
                            .map((c) => c.text)
                            .join("")
                            .trim();

                    if (title) {
                        await step.run("update-conversation-title", async () => {
                            await convex.mutation(api.system.updateConversationTitle, {
                                internalKey,
                                conversationId,
                                title,
                            });
                        });
                    }
            }
        }

        //Create the codeing agent with file tools
        const codingAgent = createAgent({
            name: "polaris",
            description: "Polaris AI coding assistant",
            system: systemPrompt,
            model: openai({
                model: "openai/gpt-oss-120b",
                apiKey: process.env.GROK_GENERATIVE_AI_API_KEY,
                 baseUrl: "https://api.groq.com/openai/v1",
            }),
            tools: [
                createListFilesTool({ projectId, internalKey }),
                createReadFilesTool({ internalKey }),
                createUpdateFileTool({ internalKey }),
                createCreateFilesTool({ projectId, internalKey }),
                createCreateFolderTool({ projectId, internalKey }),
                createRenameFileTool({ internalKey }),
                createDeleteFilesTool({ internalKey }),
                createScrapeUrlsTool(),
            ],
        });

        const network = createNetwork({
            name: "polaris-network",
            agents: [codingAgent],
            maxIter: 20,
            router: ({ network }) => {
                const lastResult = network.state.results.at(-1);
                const hasTextResponse = lastResult?.output.some((msg) => msg.type === "text" && msg.role === "assistant");

                //const hasToolCalls = lastResult?.output.some((msg) => msg.type === "tool_call");

                if (hasTextResponse) {
                    return undefined; // No more iterations needed, return undefined to stop
                }
                return codingAgent;
            }
        });

        const result = await network.run(message);

        const lastResult = result.state.results.at(-1);
        const textMessage = lastResult?.output.find(
            (msg) => msg.type === "text" && msg.role === "assistant"
        );

        let assistantResponse = "I processed your reuest. Let me know if you need anything else!";


        if (textMessage?.type === "text") {
            assistantResponse = typeof textMessage.content === "string"
                ? textMessage.content
                : textMessage.content.map((c) => c.text).join("");
        }

        await step.run("update-assistant-message", async () => {
            await convex.mutation(api.system.updateMessageContent, {
                internalKey,
                messageId,
                content: assistantResponse,
            })
        });

        return { success: true, messageId, conversationId };
    }
);