import { addKeyword, EVENTS } from '@builderbot/bot'


const locationEvent = addKeyword(EVENTS.LOCATION)
    .addAction(async (ctx, {provider,  flowDynamic }) => {
        await flowDynamic('No me envies tu localizacion 📍, mejor te envio la mia 😉') 
        
        await provider.vendor.sendMessage(
            ctx.key.remoteJid, {
            location: {
                degreesLatitude: 40.4197103,
                degreesLongitude: -3.710447,
                name: "BerryBarber",
                address: "C. de Preciados, 39"
            }
            }
        )
    })

export { locationEvent }