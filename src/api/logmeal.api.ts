import axios from "axios";
import FormData from "form-data"; 

const LOGMEAL_API_URL = "https://api.logmeal.com/v2/image/segmentation/complete/v1.0";
const LOGMEAL_API_KEY = process.env.LOGMEAL_API_KEY;

export const uploadFoodImageToLogMeal = async (formData: FormData) => {
    try {
        const response = await axios.post(
            LOGMEAL_API_URL,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${LOGMEAL_API_KEY}`,
                    ...formData.getHeaders(), 
                },
            }
        );

        return { success: true, data: response.data };
    } catch (error) {
        console.error("❌ Error uploading food image to LogMeal:", error);
        return { success: false, message: "Failed to upload food image." };
    }
};
