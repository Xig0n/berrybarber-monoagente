import axios from 'axios';

interface ScaffoldList {
    number: string;
    options: object; // Asegúrate de que esto coincida con la definición esperada
    listMessage: {
      title: string;
      description: string;
      buttonText: string;
      footerText: string;
      sections: {
        title: string;
        rows: {
          title: string;
          description: string;
          rowId: string;
        }[];
      }[];
    };
  }

async function sendList(scaffoldList: ScaffoldList): Promise<void> {
    try {
        const url = new URL(`message/sendList/${process.env.EAPI_INSTANCE}`, process.env.EAPI_URL);
        await axios.post(url.toString(), scaffoldList, {
            headers: {
                apikey: process.env.EAPI_KEY
            }
        });
    } catch (error) {
        console.error('Error al enviar la lista!', error);
    }
}

export { sendList };
