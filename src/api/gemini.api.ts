import axios from "axios";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const extractGeminiText = (responseData: any): string => {
    return (
        responseData?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No data available"
    );
};

export const callGeminiAPI = async (prompt: string) => {
    try {
        const response = await axios.post(
            GEMINI_API_URL,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            {
                params: { key: GEMINI_API_KEY },
                headers: { "Content-Type": "application/json" },
            }
        );

        const message = extractGeminiText(response.data);
        return { success: true, message };
    } catch (error) {
        console.error("❌ Error calling Gemini API:", error);
        return { success: false, message: "Failed to call Gemini API" };
    }
};

