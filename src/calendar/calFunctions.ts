import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import "dotenv/config";
import { sendList } from '../utils/sendList';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ruta al archivo de clave de servicio
const KEYFILE_PATH = path.join(__dirname, 'calendarAPI.json');

// Constantes de configuración
const CALENDAR_ID = process.env.CALENDAR_ID!;
const TIMEZONE = process.env.TIMEZONE ?? 'Europe/Madrid';
const START_TIME = '09:00:00';
const END_TIME = '21:00:00';
const SLOT_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos
const DAYS_CLOSED = [0]; // 0 = Domingo
const SCOPES = ['https://www.googleapis.com/auth/calendar'];


async function getAuthClient(): Promise<any> {
    const auth = new GoogleAuth({
        keyFile: KEYFILE_PATH,
        scopes: SCOPES,
    });
    return auth.getClient();
}

async function getAvailableSlots(dateStr: string, appointmentDuration: number = SLOT_DURATION): Promise<string[]> {
    try {
        const authClient = await getAuthClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        return await getDayAvailableSlots(dateStr, appointmentDuration, calendar);
    } catch (error) {
        handleCalendarError(error);
        return [];
    }
}

async function getDayAvailableSlots(date: string, appointmentDuration: number, calendar: any): Promise<string[]> {
    // Definir las horas de inicio y fin del día
    let dayStart = new Date(`${parseDate(date)}T${START_TIME}`);
    const dayEnd = new Date(`${parseDate(date)}T${END_TIME}`);

    // Obtener la fecha y hora actual
    const currentDate = new Date();

    // Verificar si la fecha proporcionada coincide con la fecha actual
    const isToday = dayStart.toDateString() === currentDate.toDateString();

    // Si la fecha es hoy, ajustar dayStart a la hora actual
    if (isToday && currentDate > dayStart) {
        dayStart = currentDate;
    }

    // Obtener los eventos del calendario en el rango definido
    const response = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Calcular los espacios de tiempo disponibles
    return calculateAvailableTimeSlots(dayStart, dayEnd, events, appointmentDuration);
}

function calculateAvailableTimeSlots(dayStart: Date, dayEnd: Date, events: any, appointmentDuration: number): string[] {
    let availableSlots: string[] = [];
    let lastEnd = dayStart;

    for (const event of events) {
        const { start, end } = getEventTimes(event);
        const eventStart = start;
        const eventEnd = end;

        while ((eventStart.getTime() - lastEnd.getTime()) >= appointmentDuration) {
            availableSlots.push(formatSlot(lastEnd, appointmentDuration));
            lastEnd = new Date(lastEnd.getTime() + appointmentDuration);
        }

        lastEnd = eventEnd > lastEnd ? eventEnd : lastEnd;
    }

    while ((dayEnd.getTime() - lastEnd.getTime()) >= appointmentDuration) {
        availableSlots.push(formatSlot(lastEnd, appointmentDuration));
        lastEnd = new Date(lastEnd.getTime() + appointmentDuration);
    }

    return availableSlots;
}

function formatSlot(startTime: Date, duration: number): string {
    const endTime = new Date(startTime.getTime() + duration);
    return `${startTime.toTimeString().split(' ')[0]} - ${endTime.toTimeString().split(' ')[0]}`;
}

function parseDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

async function hasAvailableSlot(date: Date, minDuration: number): Promise<boolean> {
    const authClient = await getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    let dayStart = new Date(`${date.toISOString().split('T')[0]}T${START_TIME}`);
    const dayEnd = new Date(`${date.toISOString().split('T')[0]}T${END_TIME}`);

    // Verificar si la fecha proporcionada coincide con la fecha actual
    const currentDate = new Date();
    const isToday = dayStart.toDateString() === currentDate.toDateString();
    // Si la fecha es hoy, ajustar dayStart a la hora actual
    if (isToday && currentDate > dayStart) {
        dayStart = currentDate;
    }

    try {
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        // Convertir los eventos a un tipo compatible
        const events: any = response.data.items?.map(item => ({
            start: item.start || {},
            end: item.end || {},
        })) || [];

        return checkAvailableSlot(dayStart, dayEnd, events, minDuration);
    } catch (error) {
        console.error('Error fetching events:', error);
        return false;
    }
}

function checkAvailableSlot(dayStart: Date, dayEnd: Date, events: any, minDuration: number): boolean {
    let lastEndTime = dayStart;

    for (const event of events) {
        const { start, end } = getEventTimes(event);
        const eventStart = start;
        const eventEnd = end;

        if (eventStart <= dayStart && eventEnd >= dayEnd) {
            return false;
        }

        const diffMinutes = (eventStart.getTime() - lastEndTime.getTime()) / (1000 * 60);
        if (diffMinutes >= minDuration) {
            return true;
        }
        lastEndTime = eventEnd;
    }

    const finalDiffMinutes = (dayEnd.getTime() - lastEndTime.getTime()) / (1000 * 60);
    return finalDiffMinutes >= minDuration;
}

function getEventTimes(event: any): { start: Date; end: Date } {
    let eventStart: Date;
    let eventEnd: Date;

    if (event.start.date) {
        eventStart = new Date(`${event.start.date}T${START_TIME}`);
        eventEnd = new Date(`${event.end.date}T${END_TIME}`);
    } else {
        eventStart = new Date(event.start.dateTime!);
        eventEnd = new Date(event.end.dateTime!);
    }

    return { start: eventStart, end: eventEnd };
}

// Función para obtener los próximos 10 días disponibles
async function getNextAvailableDays(minDuration: number): Promise<string[]> {
    const today = new Date();
    const nextAvailableDays: string[] = [];

    while (nextAvailableDays.length < 10) {
        const dayOfWeek = today.getDay();

        if (!DAYS_CLOSED.includes(dayOfWeek)) {
            const isAvailable = await hasAvailableSlot(today, minDuration);
            if (isAvailable) {
                nextAvailableDays.push(capitalizeMonth(today.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })));
            }
        }

        today.setDate(today.getDate() + 1);
    }
    return nextAvailableDays;
}

function capitalizeMonth(dateStr: string): string {
    return dateStr.replace(/\b\p{L}/u, char => char.toUpperCase());
}

function parseDateFromText(dateStr: string): string {
    const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const [day, monthName] = dateStr.split(' De ');
    const monthIndex = monthNames.indexOf(monthName);

    if (monthIndex === -1) {
        throw new Error('Mes no válido');
    }
    
    const currentYear = new Date().getFullYear();
    return `${day.padStart(2, '0')}/${(monthIndex + 1).toString().padStart(2, '0')}/${currentYear}`;
}

// Definiciones de tipos para las estructuras de datos
interface ListRow {
    title: string;
    description: string;
    rowId: string;
}

interface ListMessage {
    title: string;
    description: string;
    buttonText: string;
    footerText: string;
    sections: {
        title: string;
        rows: ListRow[];
    }[];
}

interface ScaffoldList {
    number: string;
    options: object;
    listMessage: ListMessage;
}

async function sendNextAvailableDays(phoneNumber: string, slotDuration: number): Promise<string[]> {
    const scaffoldList: ScaffoldList = {
        number: `${phoneNumber}@s.whatsapp.net`,
        options: {},
        listMessage: {
            title: "Días Disponibles",
            description: "¿Qué día te viene bien?",
            buttonText: "Abrir Calendario",
            footerText: "",
            sections: [
                {
                    title: "Días disponibles para agendar",
                    rows: []
                }
            ]
        }
    };

    const availableDays = await getNextAvailableDays(slotDuration);
    availableDays.forEach((day, index) => {
        scaffoldList.listMessage.sections[0].rows.push({
            title: day,
            description: parseDateFromText(day),
            rowId: index.toString(),
        });
    });
    
    await sendList(scaffoldList);
    return availableDays;
}
async function getAvailableHours(selectedDay: string, slotDuration: number): Promise<string | null> {
    const availableHours = await getAvailableSlots(selectedDay, slotDuration);
    return availableHours.length > 0
        ? availableHours.map((day, index) => {
            const [startTime, endTime] = day.split(' - ');
            return `| ${index + 1} | De ${startTime.split(':').slice(0, 2).join(':')} a ${endTime.split(':').slice(0, 2).join(':')} 🕐\n`;
        }).join('')
        : null;
}

async function createEvent(date, startTime, endTime, summary, description) {
    const authClient = await getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const startDateTime = `${parseDate(date)}T${startTime}:00`;
    const endDateTime = `${parseDate(date)}T${endTime}:00`;

    // Verificar si el slot ya está ocupado
    const isSlotOccupied = await checkIfSlotOccupied(calendar, startDateTime, endDateTime);
    if (isSlotOccupied) {
        console.error(`The slot from ${startTime} to ${endTime} on ${date} is already occupied.`);
        return null; // Devuelve null o lanza un error si prefieres
    }

    const event = {
        summary,
        description,
        start: {
            dateTime: startDateTime,
            timeZone: TIMEZONE,
        },
        end: {
            dateTime: endDateTime,
            timeZone: TIMEZONE,
        },
    };

    try {
        // Llamada correcta a calendar.events.insert
        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            requestBody: event, // Usa requestBody en lugar de resource
        });
        console.log(`Event created: ${date} : ${startTime}/${endTime} : ${summary}`);
        return response.data;
    } catch (error) {
        console.error('Error creating event: ', error);
        throw error;
    }
}

async function checkIfSlotOccupied(calendar: any, startDateTime: string, endDateTime: string): Promise<boolean> {
    try {
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: new Date(startDateTime).toISOString(),
            timeMax: new Date(endDateTime).toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items || [];
        return events.length > 0; // Si hay algún evento, el slot está ocupado
    } catch (error) {
        handleCalendarError(error);
        return false;
    }
}

function handleCalendarError(error: any) {
    if (error.code === 404) {
        console.error('Error: Calendar ID not found. Please check the calendar ID and try again.');
    } else {
        console.error('Error fetching events', error);
    }
}

export { getAvailableSlots, getNextAvailableDays, sendNextAvailableDays, getAvailableHours, createEvent, parseDateFromText };
