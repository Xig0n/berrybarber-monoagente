import { sendList } from './sendList.js';

interface ScaffoldList {
    number: string;
    options: Record<string, unknown>;
    listMessage: {
        title: string;
        description: string;
        buttonText: string;
        footerText: string;
        sections: Array<{
            title: string;
            rows: Array<{
                title: string;
                description: string;
                rowId: string;
            }>;
        }>;
    };
}

async function sendConfirmationList(phoneNumber: string, description: string): Promise<void> {
    const scaffoldList: ScaffoldList = {
        number: `${phoneNumber}@s.whatsapp.net`,
        options: {},
        listMessage: {
            title: 'CONFIRMA TU CITA',
            description: description,
            buttonText: 'CONFIRMAR',
            footerText: '',
            sections: [
                {
                    title: 'Días disponibles para agendar',
                    rows: [
                        {
                            title: 'Sí',
                            description: 'Te enviaremos los detalles de tu cita',
                            rowId: '1',
                        },
                        {
                            title: 'No',
                            description: 'Volverás al menú principal',
                            rowId: '2',
                        },
                    ],
                },
            ],
        },
    };

    await sendList(scaffoldList);
}

export { sendConfirmationList };
