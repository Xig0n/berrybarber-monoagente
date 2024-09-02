import { addKeyword, EVENTS } from '@builderbot/bot';
import { toAsk } from "@builderbot-plugins/openai-assistants";
import { typing } from "../utils/presence.js";
import { enqueueMessage } from '../utils/fastEtiries.js';
import { BaileysProvider } from "@builderbot/provider-baileys";


const ASSISTANT_ID: string = process.env?.ASSISTANT_ID ?? '';

const informationFlow = addKeyword<BaileysProvider>(EVENTS.ACTION)
    .addAction({ capture: true }, async (ctx, { flowDynamic, state, provider, fallBack }) => {
        try {
            if (ctx.key?.remoteJid !== undefined) {
                await typing(ctx, provider);
                
                enqueueMessage(ctx, async (body: string) => {
                    const response: string = await toAsk(ASSISTANT_ID, body, state);
                    const chunks: string[] = response.replace(/【.*?】/g, "").split(/\n\n+/);
                    for (const chunk of chunks) {
                        await flowDynamic([{ body: chunk.trim() }]);
                    }
                });
                  
                return fallBack();    
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

export { informationFlow };

