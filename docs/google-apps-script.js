/**
 * Méra OS — Google Apps Script Upload Handler
 * Menangani upload foto absensi kru (pos-dashboard) & strip foto photobooth (customer-portal).
 * 
 * Deployment Instructions:
 * 1. Buka https://script.google.com/home
 * 2. Klik "New project"
 * 3. Hapus semua kode default dan paste kode di bawah ini.
 * 4. Klik "Deploy" -> "New deployment"
 * 5. Pilih icon gear (Select type) -> "Web app"
 * 6. Set Description: "Méra OS Upload Webhook"
 * 7. Set "Execute as": "Me" (<email akun Google Anda>)
 * 8. Set "Who has access": "Anyone" (PENTING! Jangan pilih 'Only myself')
 * 9. Klik "Deploy" -> "Authorize access" -> Login Google -> "Advanced" -> "Go to Untitled project (unsafe)" -> "Allow"
 * 10. Salin "Web app URL" (format: https://script.google.com/macros/s/.../exec)
 * 11. Masukkan URL tersebut ke:
 *     - apps/pos-dashboard/.env.local (VITE_APPS_SCRIPT_URL=...)
 *     - apps/customer-portal/.env.local (NEXT_PUBLIC_APPS_SCRIPT_URL=...)
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ ok: false, error: 'Empty postData payload' }, 400);
    }

    var contents = JSON.parse(e.postData.contents);
    var fileName = contents.fileName || ('upload_' + new Date().getTime() + '.jpg');
    var mimeType = contents.mimeType || 'image/jpeg';
    var base64Data = contents.data;
    // Default folder: Folder Absensi (1KfG7aIPXbZIoOG857fFl73jfYJozAYBI)
    var folderId = contents.folderId || '1KfG7aIPXbZIoOG857fFl73jfYJozAYBI';

    if (!base64Data) {
      return responseJSON({ ok: false, error: 'Missing image data (base64)' }, 400);
    }

    // Decode base64 to blob
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);

    // Cari folder Drive tujuan
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (fErr) {
      folder = DriveApp.getRootFolder();
    }

    var file = folder.createFile(blob);
    file.setDescription('Uploaded via Méra OS - ' + new Date().toISOString());

    return responseJSON({
      ok: true,
      fileId: file.getId(),
      url: file.getUrl(),
      fileName: fileName
    }, 200);

  } catch (error) {
    return responseJSON({ ok: false, error: error.toString() }, 500);
  }
}

function doGet(e) {
  return responseJSON({
    ok: true,
    message: 'Méra OS Google Drive Upload Webhook is ACTIVE!',
    timestamp: new Date().toISOString()
  }, 200);
}

function responseJSON(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
