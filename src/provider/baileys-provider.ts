import { createProvider } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';

const BUSINESS_NUMBER = process.env.BUSINESS_NUMBER;

// Define los tipos para las opciones de configuración
const BaileysProviderOptions = {
    experimentalStore: true,  // Significantly reduces resource consumption
    timeRelease: 10800000,    // Cleans up data every 3 hours (in milliseconds)
    groupsIgnore: true,
    readStatus: false,
    usePairingCode: true,
    phoneNumber: BUSINESS_NUMBER,
};

const adapterProvider = createProvider(BaileysProvider, BaileysProviderOptions);

export { adapterProvider };
