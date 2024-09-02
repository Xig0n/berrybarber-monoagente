import { addKeyword, EVENTS } from '@builderbot/bot'
import { typing } from "../utils/presence.js"
import { getThumbnailBuffer } from '../utils/getThumbnailBuffer.js'
import { BaileysProvider } from "@builderbot/provider-baileys";


// FLOWS
import { informationFlow } from './informationFlow.js'

// GLOBAL VARIABLES
const BUSINESS_NAME = process.env.BUSINESS_NAME ?? 'SIN_NOMBRE'
const BUSINESS_NUMBER = process.env.BUSINESS_NUMBER


const welcomeFlow = addKeyword<BaileysProvider>(EVENTS.WELCOME)
    .addAction(async (ctx, { provider, flowDynamic }) => {
        // SEND TYPING
        await typing(ctx, provider)
        // SEND WELCOME MESSAGE
        await flowDynamic(`Hola *${ctx.name}*!\nBienvenido a *${BUSINESS_NAME}* 💈`, {delay: 2500})
        // SEND CATALOG
        await provider.vendor.sendMessage(ctx.from + '@s.whatsapp.net', {text: `https://wa.me/c/${BUSINESS_NUMBER}`, linkPreview: {"canonical-url": `https://wa.me/c/${BUSINESS_NUMBER}`, "matched-text": `https://wa.me/c/${BUSINESS_NUMBER}`, title: `Servicios ${BUSINESS_NAME}`, description:'Agenda tu cita aqui 💇‍♂️', jpegThumbnail: await getThumbnailBuffer('https://botberry.es/wp-content/uploads/2024/08/degradado.webp')}})
    })
    // SEND VOICE NOTE
    .addAnswer(`Send Audio`, { media: 'assets/BerryBarber.mp3' }, async (_, { gotoFlow }) => {
        return gotoFlow(informationFlow)
    })
export { welcomeFlow }