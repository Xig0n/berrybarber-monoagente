import { addKeyword, utils } from '@builderbot/bot';
import { sendNextAvailableDays, parseDateFromText, getAvailableHours, createEvent } from '../calendar/calFunctions.js';
import { sendConfirmationList } from '../utils/confirmationList.js';
import { typing } from "../utils/presence.js";
import { BaileysProvider } from "@builderbot/provider-baileys";


// Tipado de variables globales
const BUSINESS_ADDRESS: string[] = process.env.BUSINESS_ADDRESS?.split(',') || [];
const BUSINESS_NAME: string = process.env.BUSINESS_NAME || '';

// Importar flujos
import { informationFlow } from './informationFlow.js';

const bookingFlow = addKeyword<BaileysProvider>(['booking', utils.setEvent('BOOKING_FLOW')])
    .addAction(async (ctx, { state, flowDynamic, provider, endFlow }) => {
        await typing(ctx, provider);
        await flowDynamic(`🫰 Precio : ${state.get('precio')}€ \n💆‍♂️ Servicio: ${state.get('productos')}\n🕐 Duracion: ${state.get('duracion')} min`);
        await flowDynamic('⌛ Cargando calendario... ', { delay: 2000 });

        try {
            const availableDays = await sendNextAvailableDays(ctx.from, parseInt(state.get('duracion')));
            await state.update({ availableDays });
        } catch (error) {
            console.error('Error al cargar los días disponibles:', error);
            return endFlow('Error al cargar el calendario, por favor intenta de nuevo.');
        }
    })
    .addAction({ capture: true }, async (ctx, { state, flowDynamic, gotoFlow, fallBack, provider, endFlow }) => {
        await typing(ctx, provider);
        const availableDays: string[] = state.get('availableDays');
        let selected = false;

        for (const day of availableDays) {
            if (day === ctx.body) {
                const parsedDay = parseDateFromText(day);
                await state.update({ selectedDay: parsedDay });

                try {
                    const availableHours = await getAvailableHours(parsedDay, parseInt(state.get('duracion')) * 60 * 1000);
                    await state.update({ availableHours });
                    if (!availableHours) {
                        return fallBack(`Ups! Parece que el horario está completo para el ${parsedDay}. Selecciona otro día disponible.`);
                    } else {
                        await flowDynamic(availableHours);
                        await flowDynamic('Escribe el índice de la hora que quieres ✏️  \n\nEjemplo: 12', { delay: 1000 });
                    }
                } catch (error) {
                    console.error('Error al obtener las horas disponibles:', error);
                    return endFlow('Error al obtener las horas disponibles, por favor intenta de nuevo.');
                }

                selected = true;
                break;
            }
        }

        if (!selected) {
            await flowDynamic('⚠️ No has seleccionado ninguna opción.');
            return gotoFlow(informationFlow);
        }
    })
    .addAction({ capture: true }, async (ctx, { state, flowDynamic, fallBack }) => {
        try {
            const availableHours: string[] = state.get('availableHours').split('\n');
            const selectedHour = availableHours[parseInt(ctx.body) - 1].match(/\d{2}:\d{2} a \d{2}:\d{2}/)?.[0];
            if (!selectedHour) throw new Error();
            await state.update({ selectedHour });
            await flowDynamic('Indícame tu nombre completo 📝');
        } catch {
            return fallBack('⚠️ La respuesta debe ser únicamente el índice de la hora deseada.');
        }
    })
    .addAction({ capture: true }, async (ctx, { state, flowDynamic }) => {
        await state.update({ name: ctx.body });
        await flowDynamic(`¡Genial ${ctx.body}! 🎉`);
        await sendConfirmationList(ctx.from, `Día ${state.get('selectedDay')} - ${state.get('selectedHour')}`);
    })
    .addAction({ capture: true }, async (ctx, { state, flowDynamic, fallBack, gotoFlow, provider, endFlow }) => {
        if (/sí|si/i.test(ctx.body)) {
            const [startTime, endTime] = state.get('selectedHour').match(/\d{2}:\d{2}/g) || [];
            const dateTime = state.get('selectedDay');

            try {
                const event = await createEvent(
                    dateTime,
                    startTime,
                    endTime,
                    state.get('productos'),
                    `Cliente: ${state.get('name')} (+${ctx.from})\nAgendadoEn: ${new Date().toISOString().replace('T', ' ')}\nPrecio: ${state.get('precio')}€`
                );

                if (!event) {
                    return endFlow('⚠️ Tu cita no ha podido ser agendada. Puede que alguna otra persona haya reservado antes que tú, intenta de nuevo.');
                } else {
                    await typing(ctx, provider);
                    provider.vendor.addChatLabel(ctx.key.remoteJid, '1');
                    await flowDynamic(`¡Cita agendada con éxito! 🙂 \n> 📅 Día: ${dateTime}  \n> 🕑 Hora: De ${state.get('selectedHour')} \n> 💆‍♂️ Servicio: ${state.get('productos')}\n> 🫰 Precio: ${state.get('precio')}€`);
                    await provider.vendor.sendMessage(
                        ctx.key.remoteJid, {
                        location: {
                            degreesLatitude: parseInt(BUSINESS_ADDRESS[1]),
                            degreesLongitude: parseInt(BUSINESS_ADDRESS[2]),
                            name: BUSINESS_NAME,
                            address: BUSINESS_ADDRESS[0]
                        }
                    });

                    await flowDynamic('Añádeme para no perderme entre tus contactos 📲👇', { delay: 2000 });
                    const vcard = `BEGIN:VCARD
VERSION:3.0
FN;CHARSET=UTF-8:BerryBarber
N;CHARSET=UTF-8:;;BerryBarber;;;
EMAIL;CHARSET=UTF-8;type=WORK,INTERNET:hello@botberry.es
PHOTO;ENCODING=b;TYPE=PNG:iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAAilBMVEUkQXz///98jbDi5u1meqM/WIzx8vYnQ379/v7e4uvN0+GksMiWo8Db3+lIYZGTob41UIdjd6F+jrGMmrkyToSBkbK6w9U+WIwtSIIpRX9MZJSHl7c7VYq3wNNacJwuSoJpfaV3ia6+xticqcQqRoBRaJdvgqnDy9tVbJk4Uofk6O9PZ5afrMaYpsHQC7umAAABmUlEQVR4nO2XaVvCMAyA16gTEERuvO9b///fk7J1y3pMtyZ9/JD3E2tLXtIrIxMEQRAE4Z+gPBynkCj1kUKi1G0KiXpJIVFJJISWFgmkkEzILHXMA9CwpGJLsAWoTiWWHOmGDZJQpeJIUItIukhGfBKcCJNkhXcwXLCfeLpEwhJ9MLkllI6AJNeOLf8tvD4PDJqQXvWz4CBCSR0stmi2Skyw2NLcLnkPDVrHFa3HRrAlHjS+rjtuoiQACyQpzgo6O71Ks3sLL2FYNw73wVDgq1jJxrNQtqTxuX8mlkS/TLBLdLTEkm2vytxFYjdHSZxoHge6PntJcLSpT7LoWmvqr+YPX9NXfw12p6uT45e7q5x7T8eYTlLOi6/rlEqyakp2T/O86iSSnJgFRhckwKB8uiSRzHcRzxqS/cOT6X+Olwz0r75rDCr3rRnx923cMlMAZnFjJVlmapWL/UsYJG66RVNV0rpIDm1mb8VyeyWjakYJX2PDC5dCAvDJLvmmTsRbtKgdjoT0z0tF6wbnkdwzGARBEARBEASBjR+X+w4dVWBp+gAAAABJRU5ErkJggg==
TEL;TYPE=WORK,VOICE:+34643933160
ORG;CHARSET=UTF-8:BotBerry
NOTE;CHARSET=UTF-8:Barberia Madrid
END:VCARD`;
                    await provider.vendor.sendMessage(
                        ctx.key.remoteJid,
                        {
                            contacts: {
                                displayName: 'BerryBarber',
                                contacts: [{ vcard }],
                            }
                        }
                    );
                    await provider.sendSticker(ctx.key.remoteJid, 'https://botberry.es/wp-content/uploads/2024/08/barber-Photoroom.webp', { pack: 'Barber', author: 'BotBerry' });
                }

                state.clear();
            } catch (error) {
                console.error('Error al crear el evento:', error);
                return endFlow('⚠️ Tu cita no ha podido ser agendada. Puede que alguna otra persona haya reservado antes que tú, intenta de nuevo.');
            }

        } else if (ctx.body === 'No') {
            await flowDynamic('Cita cancelada con éxito 🙂');
            state.clear();
            return gotoFlow(informationFlow);
        } else {
            await flowDynamic('⚠️ Debes seleccionar una de las opciones', { delay: 2000 });
            await sendConfirmationList(ctx.from, `Día ${state.get('selectedDay')} - ${state.get('selectedHour')}`);
            return fallBack();
        }
    });

export { bookingFlow };
