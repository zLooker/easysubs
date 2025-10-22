import { GoogleGenAI } from "@google/genai";

const SUPPORTED_LANGUAGES = [
  "af",
  "sq",
  "am",
  "ar",
  "hy",
  "as",
  "az",
  "bn",
  "ba",
  "eu",
  "be",
  "bs",
  "bg",
  "yue",
  "ca",
  "ceb",
  "zh-Hans",
  "zh-Hant",
  "co",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "eo",
  "et",
  "fo",
  "fj",
  "fil",
  "fi",
  "fr",
  "fy",
  "gl",
  "ka",
  "de",
  "el",
  "gu",
  "ht",
  "ha",
  "he",
  "hi",
  "hu",
  "is",
  "ig",
  "id",
  "ga",
  "it",
  "ja",
  "jv",
  "kn",
  "kk",
  "km",
  "rw",
  "ko",
  "ku",
  "ky",
  "lo",
  "la",
  "lv",
  "li",
  "lt",
  "lb",
  "mk",
  "mg",
  "ms",
  "ml",
  "mt",
  "mr",
  "mn",
  "my",
  "ne",
  "no",
  "ny",
  "or",
  "ps",
  "fa",
  "pl",
  "pt",
  "pa",
  "ro",
  "ru",
  "sm",
  "gd",
  "sr",
  "st",
  "sn",
  "sd",
  "si",
  "sk",
  "sl",
  "so",
  "es",
  "su",
  "sw",
  "sv",
  "tl",
  "tg",
  "ta",
  "tt",
  "te",
  "th",
  "bo",
  "tr",
  "tk",
  "uk",
  "ur",
  "ug",
  "uz",
  "vi",
  "cy",
  "xh",
  "yi",
  "yo",
  "zu",
] as const;

// Map language codes to full names for better translation
const LANGUAGE_NAMES: Record<string, string> = {
  "af": "Afrikaans",
  "sq": "Albanian",
  "am": "Amharic",
  "ar": "Arabic",
  "hy": "Armenian",
  "az": "Azerbaijani",
  "eu": "Basque",
  "be": "Belarusian",
  "bn": "Bengali",
  "bs": "Bosnian",
  "bg": "Bulgarian",
  "ca": "Catalan",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
  "hr": "Croatian",
  "cs": "Czech",
  "da": "Danish",
  "nl": "Dutch",
  "en": "English",
  "et": "Estonian",
  "fi": "Finnish",
  "fr": "French",
  "gl": "Galician",
  "ka": "Georgian",
  "de": "German",
  "el": "Greek",
  "gu": "Gujarati",
  "ht": "Haitian Creole",
  "he": "Hebrew",
  "hi": "Hindi",
  "hu": "Hungarian",
  "is": "Icelandic",
  "id": "Indonesian",
  "ga": "Irish",
  "it": "Italian",
  "ja": "Japanese",
  "kn": "Kannada",
  "kk": "Kazakh",
  "km": "Khmer",
  "ko": "Korean",
  "lo": "Lao",
  "lv": "Latvian",
  "lt": "Lithuanian",
  "mk": "Macedonian",
  "ms": "Malay",
  "ml": "Malayalam",
  "mt": "Maltese",
  "mr": "Marathi",
  "mn": "Mongolian",
  "my": "Myanmar (Burmese)",
  "ne": "Nepali",
  "no": "Norwegian",
  "fa": "Persian",
  "pl": "Polish",
  "pt": "Portuguese",
  "pa": "Punjabi",
  "ro": "Romanian",
  "ru": "Russian",
  "sr": "Serbian",
  "si": "Sinhala",
  "sk": "Slovak",
  "sl": "Slovenian",
  "so": "Somali",
  "es": "Spanish",
  "sw": "Swahili",
  "sv": "Swedish",
  "ta": "Tamil",
  "te": "Telugu",
  "th": "Thai",
  "tr": "Turkish",
  "uk": "Ukrainian",
  "ur": "Urdu",
  "uz": "Uzbek",
  "vi": "Vietnamese",
  "cy": "Welsh",
  "yi": "Yiddish",
  "zu": "Zulu",
};

type TRequest = {
  text: string;
  lang: (typeof SUPPORTED_LANGUAGES)[number];
};

class GeminiTranslateFetcher {
  #client: GoogleGenAI | null;
  #apiKey: string | null;
  #model: string | null;

  constructor() {
    this.#client = null;
    this.#apiKey = null;
    this.#model = null;
  }

  setApiKey(apiKey: string, model?: string) {
    this.#apiKey = apiKey;
    this.#model = model || "gemini-2.0-flash-exp";
    if (apiKey) {
      this.#client = new GoogleGenAI({ apiKey });
    } else {
      this.#client = null;
    }
  }

  async getFullTextTranslation({ text, lang }: TRequest): Promise<string> {
    if (!this.#client || !this.#apiKey) {
      throw new Error("Gemini API key is required for translation");
    }

    try {
      const targetLanguage = LANGUAGE_NAMES[lang] || lang;
      const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translation, nothing else:\n\n${text}`;

      const response = await this.#client.models.generateContent({
        model: this.#model || "gemini-2.0-flash-exp",
        contents: prompt,
      });

      const translatedText = response.text || "";
      return translatedText.trim();
    } catch (error) {
      console.error("Gemini translation error:", error);
      throw error;
    }
  }
}

export const geminiTranslateFetcher = new GeminiTranslateFetcher();
