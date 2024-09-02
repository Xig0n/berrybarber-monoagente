import { createBot, createFlow } from '@builderbot/bot';
import { MemoryDB as Database } from '@builderbot/bot';
import { adapterProvider } from './provider/baileys-provider.js';

// CALENDAR FUNCTIONS
import { checkEvents } from './calendar/alertEvents.js';

// GLOBAL VARIABLES
const PORT: number = parseInt(process.env.PORT ?? '3008');
const BUSINESS_NUMBER: string | undefined = process.env.BUSINESS_NUMBER;
const INTERVAL_CALENDAR_TIME: number = 5 * 60 * 1000; // 5 minutos en milisegundos

// FLOWS
import { bookingFlow } from './flows/bookingFlow.js';
import { welcomeFlow } from './flows/welcomeFlow.js';
import { informationFlow } from './flows/informationFlow.js';
import { voiceNoteEvent } from './flows/voiceNoteEvent.js';
import { locationEvent } from './flows/locationEvent.js';

const main = async () => {
    const adapterFlow = createFlow([bookingFlow, welcomeFlow, informationFlow, voiceNoteEvent, locationEvent]);

    const adapterDB = new Database();

    const { handleCtx, httpServer, provider, stateHandler } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    }, {
        queue: {
            timeout: 20000, // 👌
            concurrencyLimit: 50 // 👌
        }
    });
    
    provider.on('message', async (ctx: any) => {
        // CHECK IF THE MESSAGE IS AN ORDER
        if (ctx.message && ctx.message.orderMessage) {
            const order = ctx.message.orderMessage;
            if (order.itemCount <= 4) {
                const orderDetails = await adapterProvider.vendor.getOrderDetails(order.orderId, order.token);
                let servicesOrdered: string[] = [];
                let durationOrder = 0;
                let hasMultipleQuantity = false;
                
                for (const product of orderDetails.products) {
                    if (product.quantity > 1) {
                        hasMultipleQuantity = true;
                        break;
                    } else {
                        servicesOrdered.push(product.name.split('/')[0]);
                        durationOrder += parseInt(product.name.split('/')[1].match(/\d+/)?.[0] ?? '0');
                    }
                }
            
                if (hasMultipleQuantity) {
                    await provider.sendMessage(ctx.from, '⚠️ No puedes reservar el mismo servicio varias veces 🔂', {}).catch(console.error);
                } else {
                    await stateHandler.updateState({ from: ctx.from })({ 
                        precio: orderDetails.price.total / 1000, 
                        productos: servicesOrdered.join('+ '), 
                        duracion: durationOrder 
                    });
                    provider.dispatchInside({ body: 'BOOKING_FLOW', name: ctx.name, from: ctx.from });
                }
            } else {
                await provider.sendMessage(ctx.from, '⚠️ Máximo 4 servicios por reserva 🔂', {});
            
                if (BUSINESS_NUMBER) {
                    await provider.vendor.sendMessage(`${ctx.from}@s.whatsapp.net`, {
                        product: {
                            productImage: {
                                url: 'https://botberry.es/wp-content/uploads/2024/08/degradado.png',
                            },
                            productId: '8639383036091339',
                            title: 'Corte Degradado',
                            description: 'Nuestro servicio más solicitado 👆',
                        },
                        businessOwnerJid: `${BUSINESS_NUMBER}@s.whatsapp.net`
                    });
                }
            }
        }
    });
    setInterval(async () => {
        await checkEvents(provider);
    }, INTERVAL_CALENDAR_TIME);

    httpServer(PORT);
}

main();
