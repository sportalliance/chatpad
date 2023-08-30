import {db} from "../db";

export async function useApiKey() {
    const settings = await db.settings.where({id: "general"}).first();
    if (settings?.openAiApiAuth == "none") {
        return null;
    }
    return settings?.openAiApiKey;
}
