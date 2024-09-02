import { addKeyword, EVENTS } from '@builderbot/bot'
import { typing } from "../utils/presence.js"
import { BaileysProvider } from "@builderbot/provider-baileys";


const voiceNoteEvent = addKeyword<BaileysProvider>(EVENTS.VOICE_NOTE)
    .addAction({delay: 4000}, async (ctx, {provider,  flowDynamic }) => {
        // SEND RECORDING VOICE
        await typing(ctx, provider)
        await flowDynamic('👂 No tengo orejas...')
    })

export { voiceNoteEvent }