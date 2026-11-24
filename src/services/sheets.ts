/**
 * Google Sheets Service for Prestier System LLP
 * Syncs lead data in real-time to Google Sheets using the provisioned OAuth scope.
 */

// We store the access token and spreadsheet ID in localStorage for persistence across reloads
const TOKEN_KEY = 'prestier_g_token';
const SPREADSHEET_ID_KEY = 'prestier_spreadsheet_id';

export interface LeadRecord {
  id: string;
  name: string;
  phone: string;
  company: string;
  outlets: string | number;
  productionInterest: 'Display Cabinet' | 'Electric Self Lable' | 'Degree in Equipment' | string;
  timestamp: string;
  status: 'Draft' | 'Submitted' | 'Synced';
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredSpreadsheetId(): string | null {
  return localStorage.getItem(SPREADSHEET_ID_KEY);
}

export function setStoredSpreadsheetId(id: string) {
  localStorage.setItem(SPREADSHEET_ID_KEY, id);
}

/**
 * Initialize Google Identity Services token client to request spreadsheets scope
 */
export function requestGoogleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if google accounts is loaded
    if (!(window as any).google?.accounts?.oauth2) {
      // Load gsi script dynamically if not present
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initTokenClient(resolve, reject);
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    } else {
      initTokenClient(resolve, reject);
    }
  });
}

function initTokenClient(resolve: (token: string) => void, reject: (err: any) => void) {
  try {
    const clientId = '908818122355-10r65ovk0alvet7910stk6um92bsmkct.apps.googleusercontent.com'; // From OAuth config
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response.error) {
          reject(response);
        } else {
          setStoredToken(response.access_token);
          resolve(response.access_token);
        }
      },
    });
    client.requestAccessToken();
  } catch (e) {
    reject(e);
  }
}

/**
 * Create a new Google Sheet for Prestier System LLP Leads if not already created
 */
export async function getOrCreateSpreadsheet(token: string): Promise<string> {
  let spreadsheetId = getStoredSpreadsheetId();
  if (spreadsheetId) return spreadsheetId;

  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'Prestier System LLP - Steel Manufacturing Inquiries',
        },
        sheets: [
          {
            properties: {
              title: 'Live Leads',
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Failed to create spreadsheet');
    }

    const data = await res.json();
    spreadsheetId = data.spreadsheetId;
    setStoredSpreadsheetId(spreadsheetId!);

    // Initialize header row
    await appendOrUpdateSheetRow(token, spreadsheetId!, [
      'Lead ID',
      'Name',
      'Phone Number',
      'Company Name',
      'Outlets',
      'Production Interest',
      'Timestamp',
      'Status',
    ]);

    return spreadsheetId!;
  } catch (e) {
    console.error('Error creating spreadsheet:', e);
    throw e;
  }
}

/**
 * Append or update lead row in Google Sheets
 */
export async function syncLeadToGoogleSheet(lead: LeadRecord): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const spreadsheetId = await getOrCreateSpreadsheet(token);
    const range = 'Live Leads!A:H';
    const valueRangeBody = {
      range,
      majorDimension: 'ROWS',
      values: [
        [
          lead.id,
          lead.name,
          lead.phone,
          lead.company,
          lead.outlets,
          lead.productionInterest,
          lead.timestamp,
          lead.status,
        ],
      ],
    };

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(valueRangeBody),
      }
    );

    return res.ok;
  } catch (e) {
    console.error('Google Sheets sync error:', e);
    return false;
  }
}

async function appendOrUpdateSheetRow(token: string, spreadsheetId: string, rowValues: string[]) {
  const range = 'Live Leads!A1:H1';
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    }
  );
}
