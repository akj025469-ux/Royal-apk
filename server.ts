import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Support large image payloads (e.g. camera photos base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure body parser errors (e.g. payload too large or malformed JSON) return JSON instead of Express HTML
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('Body parser error:', err?.message || err);
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({
        success: false,
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Image size is too large. Please select a smaller photo or standard photo.',
      });
    }
    return res.status(err.status || 400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: err.message || 'Invalid request payload.',
    });
  }
  next();
});

// Helper to get GoogleGenAI client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient helper that retries on 503/429 and cascades across compatible models
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  // Free-tier capable text/multimodal models
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        const isUnavailableOrRateLimited =
          err?.status === 503 ||
          err?.code === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          err?.status === 429 ||
          errMsg.includes('429');

        if (isUnavailableOrRateLimited) {
          console.warn(`[OCR Engine] Model ${model} returned 503/429 (attempt ${attempt + 1}). Retrying / falling back...`);
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        } else {
          // If non-transient, break to next candidate model
          break;
        }
      }
    }
  }

  throw lastError;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// CHALLAN OCR ENDPOINT
app.post('/api/ocr/challan', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'NO_IMAGE',
        message: 'No image provided for challan scanning.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        error: 'OFFLINE_OR_NO_KEY',
        message: 'Internet connection required for advanced recognition.',
      });
    }

    // Strip prefix if included
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');

    const prompt = `You are an expert OCR and document intelligence system specializing in Indian dairy supply challans, invoices, and delivery memos (such as Amul, Mother Dairy, Nandini, Saras, Verka, etc.).

Carefully analyze this challan image and extract all visible data into a clean JSON structure.
Do NOT guess or hallucinate. If a field is missing, obscured, or not present on the document, leave it as an empty string "" or 0.

Extract these exact fields:
1. Header & Transport info:
- gccmp: GCCM/P number or code
- partyName: Party / Ship To / Customer Name / Distributor Name
- routeDemandFpo: Route / Demand FPO / Sector
- pan: PAN Number
- gstin: GSTIN Number
- purDocRefNo: Purchase Document Reference Number
- orderDate: Order Date (YYYY-MM-DD or as written)
- dcNo: Delivery Challan (D.C.) Number / Challan No / Invoice No
- dispatchDate: Dispatch Date (YYYY-MM-DD or as written)
- dispatchTime: Dispatch Time (HH:mm)
- vehicleNo: Vehicle Number (e.g., DL1L 1234, GJ01 AB 1234)
- internalRefNo: Internal Reference Number
- tssanNumber: TSSAN Number

2. Product Table rows (extract every row present in the table):
- srNo: Serial number (number or 1, 2, 3...)
- hsnSac: HSN/SAC code
- productCode: Product short code (e.g. GD, TM, CM, BM, DT, MT, CH, DHI, PNR)
- productName: Full product pack name (e.g. Amul Gold 500ml, Amul Taaza 500ml)
- crates: Total Crates / CBX (number)
- quantity: Quantity / Pouches / Units (number)
- rate: Rate per unit / crate (number, or 0 if not given)
- amount: Total amount for this item (number, or 0 if not given)

3. Bottom Totals & Financials:
- netIssuedQty: Net Issued Quantity (number)
- cbxQty: CBX Quantity (number)
- totalQty: Total Quantity in pouches/units (number)
- netWeight: Net Weight in KG (number)
- grossWeight: Gross Weight in KG (number)
- basicAmount: Basic Amount before tax (number)
- taxAmount: Tax Amount (GST) (number)
- freightSubsidy: Freight Subsidy (number)
- freight: Freight Charges (number)
- netInvoiceAmount: Net Invoice / Total Challan Amount (number)
- totalCratesIssue: Total Crates Issued (number)
- totalOutstanding: Total Outstanding balance (number)
- deviation: Deviation / Discrepancy amount (number)
- customerClosingBalance: Customer Closing Balance (number)

4. Metadata:
- confidence: "high", "medium", or "low" based on readability of text
- isDocumentReadable: true if this is actually a readable document/challan, false if blurry, blank, or irrelevant photo
- unrecognizedFields: list of strings indicating fields that were requested but unreadable or absent

Respond ONLY with valid JSON in this structure:
{
  "isDocumentReadable": boolean,
  "confidence": "high" | "medium" | "low",
  "gccmp": string,
  "partyName": string,
  "routeDemandFpo": string,
  "pan": string,
  "gstin": string,
  "purDocRefNo": string,
  "orderDate": string,
  "dcNo": string,
  "dispatchDate": string,
  "dispatchTime": string,
  "vehicleNo": string,
  "internalRefNo": string,
  "tssanNumber": string,
  "items": [
    {
      "srNo": number,
      "hsnSac": string,
      "productCode": string,
      "productName": string,
      "crates": number,
      "quantity": number,
      "rate": number,
      "amount": number
    }
  ],
  "totals": {
    "netIssuedQty": number,
    "cbxQty": number,
    "totalQty": number,
    "netWeight": number,
    "grossWeight": number,
    "basicAmount": number,
    "taxAmount": number,
    "freightSubsidy": number,
    "freight": number,
    "netInvoiceAmount": number,
    "totalCratesIssue": number,
    "totalOutstanding": number,
    "deviation": number,
    "customerClosingBalance": number
  },
  "unrecognizedFields": string[]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text?.trim() || '';
    if (!responseText) {
      return res.status(200).json({
        success: false,
        error: 'UNREADABLE',
        message: 'Could not read enough information. Please enter the details manually.',
      });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      return res.status(200).json({
        success: false,
        error: 'PARSE_ERROR',
        message: 'Could not read enough information. Please enter the details manually.',
      });
    }

    if (!parsedData.isDocumentReadable && (!parsedData.items || parsedData.items.length === 0)) {
      return res.status(200).json({
        success: false,
        error: 'UNREADABLE',
        message: 'Could not read enough information. Please enter the details manually.',
      });
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (err: any) {
    console.error('Challan OCR error:', err);
    const errMsg = String(err?.message || err || '');
    const isHighDemand =
      err?.status === 503 ||
      err?.code === 503 ||
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('high demand') ||
      err?.status === 429 ||
      errMsg.includes('429');

    return res.status(200).json({
      success: false,
      error: isHighDemand ? 'HIGH_DEMAND' : 'SERVER_ERROR',
      message: isHighDemand
        ? 'Scanning service is currently experiencing temporary high demand. Please try again in a moment.'
        : 'Internet connection required for advanced recognition.',
      details: errMsg,
    });
  }
});

// HANDWRITTEN REGISTER OCR ENDPOINT
app.post('/api/ocr/register', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', shortFormMappings = {} } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'NO_IMAGE',
        message: 'No image provided for register scanning.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        error: 'OFFLINE_OR_NO_KEY',
        message: 'Internet connection required for advanced recognition.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');

    const mappingsStr = JSON.stringify(shortFormMappings);

    const prompt = `You are an expert handwriting OCR engine trained specifically for Indian dairy distribution registers, daily delivery notebooks, and milk distribution diaries (Hindi/English).

Short-form product abbreviations used by the dairy business:
${mappingsStr}
(Default standards: FC = Full Cream / Amul Gold, GD = Gold, TM = Toned Milk / Taaza, DT = DTM / Double Toned, CM = Cow Milk, BM = Buffalo Milk, MT = Moti, CH = Chaas / Buttermilk).

Analyze this handwritten register page and extract each customer delivery line.
For each row extract:
- date: Entry Date (YYYY-MM-DD or standard formatted date)
- customerName: Customer name or shop name (e.g. "Radhe Tea", "Sharma ji", "Gupta Store", "Verma Dairy")
- productCode: Short product code (e.g. GD, TM, CM, BM, DT, MT, CH, FC)
- productName: Full product name corresponding to code
- quantity: Number of pouches or liters (number)
- shift: "AM" for morning or "PM" for evening (infer from header, time or AM/PM notation, default "AM")
- rate: Rate per unit if mentioned (number, or 0 if omitted)
- amount: Total amount if calculated on page (number, or 0)
- paymentCollected: Cash or UPI payment amount collected on the spot if noted (number, or 0)
- balance: Closing or pending balance noted for customer (number, or 0)
- confidence: "high", "medium", or "low"
- rawText: Exact unformatted text fragment for this row

Return JSON with this schema:
{
  "isDocumentReadable": boolean,
  "confidence": "high" | "medium" | "low",
  "detectedDate": string,
  "detectedShift": "AM" | "PM",
  "rows": [
    {
      "date": string,
      "customerName": string,
      "productCode": string,
      "productName": string,
      "quantity": number,
      "shift": "AM" | "PM",
      "rate": number,
      "amount": number,
      "paymentCollected": number,
      "balance": number,
      "confidence": "high" | "medium" | "low",
      "rawText": string
    }
  ],
  "unrecognizedRows": string[]
}

If the image is not a handwritten ledger or is completely illegible, set isDocumentReadable to false and return empty rows.`;

    const response = await callGeminiWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text?.trim() || '';
    if (!responseText) {
      return res.status(200).json({
        success: false,
        error: 'UNREADABLE',
        message: 'Could not read enough information. Please enter the details manually.',
      });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      return res.status(200).json({
        success: false,
        error: 'PARSE_ERROR',
        message: 'Could not read enough information. Please enter the details manually.',
      });
    }

    if (!parsedData.isDocumentReadable && (!parsedData.rows || parsedData.rows.length === 0)) {
      return res.status(200).json({
        success: false,
        error: 'UNREADABLE',
        message: 'Could not read enough information. Please enter the details manually.',
      });
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (err: any) {
    console.error('Register OCR error:', err);
    const errMsg = String(err?.message || err || '');
    const isHighDemand =
      err?.status === 503 ||
      err?.code === 503 ||
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('high demand') ||
      err?.status === 429 ||
      errMsg.includes('429');

    return res.status(200).json({
      success: false,
      error: isHighDemand ? 'HIGH_DEMAND' : 'SERVER_ERROR',
      message: isHighDemand
        ? 'Scanning service is currently experiencing temporary high demand. Please try again in a moment.'
        : 'Internet connection required for advanced recognition.',
      details: errMsg,
    });
  }
});

// Vite Middleware & SPA serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ROYAL ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
