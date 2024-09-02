import { google } from 'googleapis';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import "dotenv/config";
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { BaileysProvider } from '@builderbot/provider-baileys';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ruta al archivo de clave de servicio
const KEYFILE_PATH = path.join(__dirname, 'calendarAPI.json');

const CALENDAR_ID = process.env.CALENDAR_ID;
const TIMEZONE = process.env.TIMEZONE ?? 'Europe/Madrid';
const BUSINESS_NAME = process.env.BUSINESS_NAME ?? 'SIN NOMBRE';

const DateFormat: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
};

// Autenticación con Google
async function getAuthClient(): Promise<OAuth2Client> {
    try {
        const auth = new GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        return await auth.getClient() as OAuth2Client;
    } catch (error) {
        console.error('Error during authentication:', error);
        // No lanzamos el error para evitar que la ejecución se detenga.
        throw new Error('Failed to authenticate with Google Calendar API');
    }
}

// Función para obtener los eventos de la próxima hora
async function getUpcomingEvents(retryCount = 3): Promise<any[]> {
    const authClient = await getAuthClient();
    if (!authClient) {
        console.error('No se pudo autenticar. Saltando la obtención de eventos.');
        return [];
    }

    const calendar = google.calendar('v3');

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 120 * 60 * 1000);

    try {
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: now.toISOString(),
            timeMax: oneHourLater.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: TIMEZONE,
            auth: authClient,
        });

        return response.data.items || [];
    } catch (error) {
        console.error('Error fetching events:', error);
        if (retryCount > 0) {
            console.log(`Retrying... Attempts left: ${retryCount}`);
            return getUpcomingEvents(retryCount - 1);
        } else {
            console.error('Failed to fetch events after multiple attempts.');
            return []; // Retornamos un arreglo vacío en lugar de lanzar un error.
        }
    }
}

// Función para verificar y notificar eventos que comienzan en 1 hora
async function checkEvents(provider: BaileysProvider) {
    try {
        const events = await getUpcomingEvents();
        const now = new Date();
        console.log(`${now.toLocaleString()} -> Checking new alerts`);

        for (const event of events) {
            if (!event.start) {
                console.error('El evento no tiene una hora de inicio definida.');
                continue;
            }

            const eventStartString = event.start.dateTime || event.start.date;
            if (!eventStartString) {
                console.error('El evento no tiene un campo dateTime o date válido.');
                continue;
            }

            const eventStart = new Date(eventStartString);
            const timeDiff = eventStart.getTime() - now.getTime();

            if (timeDiff <= 120 * 60 * 1000 && timeDiff > 115 * 60 * 1000) {
                const phoneNumberMatch = event.description?.match(/\+\d{10,12}/);
                const clientNameMatch = event.description?.match(/Cliente: ([A-Za-z]+)/);

                if (phoneNumberMatch && clientNameMatch) {
                    const phoneNumber = phoneNumberMatch[0].substring(1);
                    const clientName = clientNameMatch[1];
                    const message = `⚠️ Hola ${clientName}, tu cita:\n\n> 🕐 Fecha: ${new Intl.DateTimeFormat('es-ES', DateFormat).format(eventStart)}\n> 💇 Servicio: ${event.summary}\n\nVa a comenzar en 2 horas, te esperamos en ${BUSINESS_NAME} 😊`;

                    await provider.sendMessage(phoneNumber, message, {});
                } else {
                    console.error('No se encontró el número de teléfono o el nombre del cliente en la descripción del evento.');
                }
            }
        }
    } catch (error) {
        console.error('Error checking events:', error);
    }
}

// Exportar la función
export { checkEvents };
