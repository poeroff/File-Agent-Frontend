// Bringing files in from Google Drive, using the picker so the user chooses
// exactly what we may see.
//
// The `drive.file` scope only covers files the user picks here — this app can
// never enumerate someone's whole Drive. That also keeps it out of Google's
// restricted-scope review, which the broader `drive.readonly` requires.
//
// Consent is asked for at this moment rather than at sign-in: people who never
// import from Drive are never shown a Drive permission screen.

const GIS_SRC = "https://accounts.google.com/gsi/client";
const PICKER_SRC = "https://apis.google.com/js/api.js";
/**
 * Two levels of access, asked for in that order.
 *
 * `drive.file` only ever covers what the user picks — which is why picking a
 * folder yields the folder alone: Drive hides children the app was never
 * granted. Reading inside a folder needs `drive.readonly`, a *restricted*
 * scope (fine while the OAuth app is in testing, but public release needs
 * Google verification and an annual security assessment).
 *
 * So the picker always opens with the narrow scope, and the broader one is
 * requested only if the user actually picked a folder. Someone importing two
 * files is never asked to hand over their whole Drive.
 */
const FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const READ_ALL_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const FOLDER_MIME = "application/vnd.google-apps.folder";

interface PickerConfig {
  clientId: string;
  apiKey: string;
  /** Cloud project number. Picker needs it to attach the picked-file grant. */
  appId: string;
}

let configRequest: Promise<PickerConfig | null> | undefined;

/**
 * The OAuth client id and API key, from the server. Returns null when either is
 * missing, which is how the UI knows to hide the entry point instead of opening
 * a picker that can't work.
 */
export function loadGooglePickerConfig(): Promise<PickerConfig | null> {
  configRequest ??= fetch("/api/drive/google-config", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<PickerConfig>) : null))
    .then((config) =>
      config && config.clientId && config.apiKey ? config : null,
    )
    .catch(() => null);
  return configRequest;
}

async function requireConfig(): Promise<PickerConfig> {
  const config = await loadGooglePickerConfig();
  if (!config) {
    throw new Error("Google Drive 연동이 설정되지 않았어요 (API 키 필요)");
  }
  return config;
}

export interface PickedFile {
  id: string;
  name: string;
  isFolder: boolean;
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

// Minimal shapes for the two Google globals this module touches.
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
      }) => TokenClient;
    };
  };
  picker: {
    PickerBuilder: new () => PickerBuilder;
    ViewId: { DOCS: string; FOLDERS: string };
    DocsView: new (viewId?: string) => DocsView;
    Feature: { MULTISELECT_ENABLED: string; SUPPORT_DRIVES: string };
    Action: { PICKED: string; CANCEL: string };
    Response: { ACTION: string; DOCUMENTS: string };
    Document: { ID: string; NAME: string; MIME_TYPE: string };
  };
}

interface DocsView {
  setIncludeFolders: (include: boolean) => DocsView;
  setSelectFolderEnabled: (enabled: boolean) => DocsView;
}

interface PickerBuilder {
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (appId: string) => PickerBuilder;
  addView: (view: DocsView) => PickerBuilder;
  enableFeature: (feature: string) => PickerBuilder;
  setCallback: (
    callback: (data: Record<string, unknown>) => void,
  ) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

declare global {
  interface Window {
    google?: GoogleGlobal;
    gapi?: { load: (name: string, callback: () => void) => void };
  }
}

const loaded = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let pending = loaded.get(src);
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
    loaded.set(src, pending);
  }
  return pending;
}

/** Asks Google for a token limited to the files the user is about to pick. */
async function requestAccessToken(
  clientId: string,
  scope: string,
): Promise<string> {
  await loadScript(GIS_SRC);
  const google = window.google;
  if (!google) throw new Error("Google sign-in script unavailable");

  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error ?? "Google 권한이 거부됐어요"));
      },
    });
    client.requestAccessToken();
  });
}

async function loadPicker(): Promise<GoogleGlobal["picker"]> {
  await loadScript(PICKER_SRC);
  const gapi = window.gapi;
  if (!gapi) throw new Error("Google picker script unavailable");
  await new Promise<void>((resolve) => gapi.load("picker", () => resolve()));
  const picker = window.google?.picker;
  if (!picker) throw new Error("Google picker unavailable");
  return picker;
}

/**
 * Opens the Drive picker and resolves with what was chosen, plus the token the
 * server needs to read exactly those items. Resolves with `null` if the user
 * closes the picker without choosing.
 */
export async function pickFromGoogleDrive(): Promise<{
  accessToken: string;
  files: PickedFile[];
} | null> {
  const config = await requireConfig();
  const accessToken = await requestAccessToken(config.clientId, FILE_SCOPE);
  const picker = await loadPicker();

  return new Promise((resolve, reject) => {
    try {
      const view = new picker.DocsView(picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);

      new picker.PickerBuilder()
        .setTitle("가져올 파일 · 폴더 선택")
        .setOAuthToken(accessToken)
        .setDeveloperKey(config.apiKey)
        // Ties the grant to this Cloud project, which is what makes the picked
        // files readable afterwards under the drive.file scope.
        .setAppId(config.appId)
        .addView(view)
        .enableFeature(picker.Feature.MULTISELECT_ENABLED)
        .enableFeature(picker.Feature.SUPPORT_DRIVES)
        .setCallback((data) => {
          const action = data[picker.Response.ACTION];
          if (action === picker.Action.CANCEL) return resolve(null);
          if (action !== picker.Action.PICKED) return;
          const documents = (data[picker.Response.DOCUMENTS] ?? []) as Record<
            string,
            string
          >[];
          resolve({
            accessToken,
            files: documents.map((document) => ({
              id: document[picker.Document.ID],
              name: document[picker.Document.NAME],
              isFolder: document[picker.Document.MIME_TYPE] === FOLDER_MIME,
            })),
          });
        })
        .build()
        .setVisible(true);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Asks for read access to the whole Drive, needed only to see inside a picked
 * folder. Kept separate so the consent screen appears at the moment its reason
 * is obvious, rather than up front for everyone.
 */
export async function requestFolderAccess(): Promise<string> {
  const config = await requireConfig();
  return requestAccessToken(config.clientId, READ_ALL_SCOPE);
}
