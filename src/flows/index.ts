import { createFlow } from "@builderbot/bot";

import { welcomeFlow } from "./welcomeFlow";
import { bookingFlow } from "./bookingFlow";
import { informationFlow } from "./informationFlow";
import { voiceNoteEvent } from "./voiceNoteEvent";
import { locationEvent } from "./locationEvent";


export default createFlow([bookingFlow, welcomeFlow, informationFlow, voiceNoteEvent, locationEvent]) 