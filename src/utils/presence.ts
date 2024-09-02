import { BaileysProvider } from "@builderbot/provider-baileys";
import { BotContext } from "@builderbot/bot/dist/types.js"

const typing = async function (ctx: BotContext, provider: BaileysProvider): Promise<void> {
    if (provider?.vendor?.sendPresenceUpdate && ctx.key?.remoteJid) {
        const id = ctx.key.remoteJid;
        await provider.vendor.sendPresenceUpdate('composing', id);
    }
}

const recording = async function (ctx: BotContext, provider: BaileysProvider): Promise<void> {
    if (provider?.vendor?.sendPresenceUpdate && ctx.key?.remoteJid) {
        const id = ctx.key.remoteJid;
        await provider.vendor.sendPresenceUpdate('recording', id);
    }
}

export { typing, recording };
